import { NextResponse } from 'next/server'
import { processActivities } from '@/lib/utils/strava'
import { calculateActivityRanking } from '@/lib/utils/ranking'
import { updateStravaActivityDescription } from '@/lib/utils/strava'
import { createClient } from '@/lib/supabase/server'
import { generateActivityDescription } from '@/lib/utils/description'
import { StravaActivity, StravaWebhookEventResponse } from '@/lib/types/strava'
import {
  STRAVA_ACTIVITY_BY_ID_ENDPOINT,
  STRAVA_API_URL,
  STRAVA_VISIBILITY,
} from '@/lib/constants/strava'
import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'

// * 1. 웹훅 검증을 위한 GET 요청 처리
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // 웹훅 검증을 위한 요청인 경우
  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
      return NextResponse.json({ 'hub.challenge': challenge })
    }
    return new NextResponse('Forbidden', { status: 403 })
  }

  // 일반적인 GET 요청 (콜백 URL 확인용)
  return new NextResponse('OK', { status: 200 })
}

async function refreshStravaToken(supabase: any, userId: string, refreshToken: string) {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  const data = await response.json()

  // 새로운 토큰으로 업데이트
  await supabase
    .from('strava_user_tokens')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(data.expires_at * 1000).toISOString(),
    })
    .eq('user_id', userId)

  return data.access_token
}

// * 2. 활동 업데이트 시 웹훅 온 이벤트 처리
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body: StravaWebhookEventResponse = await request.json()

    // * 활동 생성 이벤트만 처리
    if (body.aspect_type !== 'create' || body.object_type !== 'activity') {
      return new NextResponse('Not a new activity', { status: 200 })
    }

    // * 유저의 스트라바 엑세스 토큰 조회
    // 전체 테이블 데이터 확인을 위한 디버깅 쿼리
    const { data: allTokens } = await supabase
      .from('strava_user_tokens')
      .select('strava_athlete_id')

    console.log(
      'All strava_athlete_ids in table:',
      allTokens?.map(t => t.strava_athlete_id)
    )

    const { data: stravaConnection } = await supabase
      .from('strava_user_tokens')
      .select('access_token, refresh_token, expires_at, user_id')
      .eq('strava_athlete_id', body.owner_id.toString())
      .maybeSingle()

    if (!stravaConnection) {
      console.error('Strava Webhook: strava_user_tokens table에서 데이터를 찾을 수 없습니다.', {
        owner_id: body.owner_id,
        owner_id_string: body.owner_id.toString(),
        all_athlete_ids: allTokens?.map(t => t.strava_athlete_id),
      })
      return new NextResponse('User not found', { status: 404 })
    }

    // * 엑세스 토큰 만료 확인 및 만료 시 갱신
    let accessToken = stravaConnection.access_token
    const expiresAt = new Date(stravaConnection.expires_at).getTime()
    const now = Date.now()
    const oneHourInMs = 3600 * 1000 // 1시간을 밀리초로 변환

    // 만료되었거나 만료까지 1시간 이내로 남은 경우 토큰 갱신
    if (expiresAt - now <= oneHourInMs) {
      accessToken = await refreshStravaToken(
        supabase,
        stravaConnection.user_id,
        stravaConnection.refresh_token
      )
    }

    // * 활동 상세 정보 조회
    const response = await fetch(
      `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(body.object_id)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    // * 스트라바 API 호출 카운트 추가
    const { error: incrementGetAPIUsageError } = await supabase.rpc('increment_strava_api_usage', {
      is_upload: false,
    })

    if (incrementGetAPIUsageError) {
      console.error('Strava Webhook: Failed to increment API usage:', incrementGetAPIUsageError)
    }

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Strava Webhook: API rate limit exceeded')
        return new NextResponse('API rate limit exceeded', { status: 429 })
      }
      console.error('Strava Webhook: Failed to fetch activity:', await response.text())
      return new NextResponse('Failed to fetch activity', { status: response.status })
    }

    const activity: StravaActivity = await response.json()

    // * 활동 데이터 DB에 저장
    await processActivities([activity], stravaConnection.user_id, supabase)

    let rankingsWithDistrict: CalculateActivityRankingReturn | null = null

    // * 랭킹 정보 계산
    // * activity.visibility가 everyone이 아닌 경우는 랭킹 데이터 계산 생략 및 디스크립션에 넣지 않음
    if (activity.visibility === STRAVA_VISIBILITY.EVERYONE) {
      rankingsWithDistrict = await calculateActivityRanking(
        activity,
        stravaConnection.user_id,
        supabase
      )
    }

    // * 디스크립션 생성
    const description = generateActivityDescription(activity, rankingsWithDistrict)

    // * 스트라바 활동 업데이트
    await updateStravaActivityDescription(accessToken, activity, description)

    // * 스트라바 API 호출 카운트 추가
    const { error: incrementPutAPIUsageError } = await supabase.rpc('increment_strava_api_usage', {
      is_upload: true,
    })

    if (incrementPutAPIUsageError) {
      console.error('Strava Webhook: Failed to increment API usage:', incrementPutAPIUsageError)
    }

    return new NextResponse('Success', { status: 200 })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new NextResponse(ERROR_MESSAGES[ERROR_CODES.STRAVA_ACTIVITY_UPDATE_FAILED], {
      status: 500,
    })
  }
}
