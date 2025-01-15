import { Database } from '@/lib/supabase/supabase'
import { ERROR_CODES } from '@/lib/constants/error'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  STRAVA_ACTIVITY_BY_ID_ENDPOINT,
  STRAVA_API_URL,
  STRAVA_ATHLETE_ACTIVITIES_ENDPOINT,
  STRAVA_VISIBILITY,
  SYNC_CONFIG,
} from '@/lib/constants/strava'
import { StravaActivity, StravaWebhookEventResponse } from '@/lib/types/strava'
import { convertUTCToKoreanTime } from '@/lib/utils/date'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/log'
import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { calculateActivityRanking } from '@/lib/utils/ranking'
import { generateActivityDescription } from '@/lib/utils/description'

export async function refreshStravaToken(supabase: any, userId: string, refreshToken: string) {
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

// 진행률 계산 헬퍼 함수
export function calculateProgress(
  fetchedPages: number,
  totalPages: number | null,
  processedActivities: number,
  totalActivities: number | null
): number {
  if (totalPages === null) {
    // 데이터 가져오는 중일 때는 전체의 40%를 할당
    return Math.round((fetchedPages / 10) * 40) // 초기 10페이지 기준
  }

  // 데이터 가져오기: 전체의 40%
  const fetchProgress = totalPages ? Math.round((fetchedPages / totalPages) * 40) : 40

  // 데이터 처리: 전체의 60%
  const processProgress = totalActivities
    ? Math.round((processedActivities / totalActivities) * 60)
    : 0

  return Math.min(100, fetchProgress + processProgress)
}

export async function fetchStravaActivities(
  accessToken: string,
  page = 1,
  supabase: SupabaseClient<Database>
): Promise<StravaActivity[]> {
  // API 사용량 증가
  const { error: usageError } = await supabase.rpc('increment_strava_api_usage', {
    is_upload: false,
  })

  if (usageError) {
    console.error('Failed to increment API usage:', usageError)
  }

  // Strava API 호출
  const response = await fetch(
    `${STRAVA_API_URL}${STRAVA_ATHLETE_ACTIVITIES_ENDPOINT}?page=${page}&per_page=${SYNC_CONFIG.FETCH_PAGE_SIZE}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    if (response.status === 429) {
      console.error('Strava API limit exceeded')
      throw new Error(ERROR_CODES.STRAVA_API_LIMIT_EXCEEDED)
    }
    console.error('Strava connection failed')
    throw new Error(ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED)
  }

  return response.json()
}

export async function processActivities(
  activities: StravaActivity[],
  userId: string,
  supabase: SupabaseClient<Database>
) {
  if (activities.length === 0) return

  const { error } = await supabase.from('activities').upsert(
    activities.map(activity => ({
      id: activity.id,
      name: activity.name,
      distance: activity.distance,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      average_watts: activity.average_watts,
      max_watts: activity.max_watts,
      average_cadence: activity.average_cadence,
      max_heartrate: activity.max_heartrate,
      total_elevation_gain: activity.total_elevation_gain,
      start_date: convertUTCToKoreanTime(activity.start_date),
      visibility: activity.visibility,
      user_id: userId,
      raw_data: activity,
    }))
  )

  if (error) throw new Error(ERROR_CODES.STRAVA_ACTIVITY_UPDATE_FAILED)
}

export async function updateStravaActivityDescription(
  accessToken: string,
  activity: StravaActivity,
  newDescription: string
): Promise<void> {
  // 기존 설명과 새로운 설명을 결합
  const combinedDescription = activity.description
    ? `${activity.description}\n\n${newDescription}`
    : newDescription

  // 업데이트된 설명으로 활동 정보 업데이트
  const updateResponse = await fetch(
    `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(activity.id)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: combinedDescription,
      }),
    }
  )

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()

    if (updateResponse.status === 429) {
      console.error('Strava API: Rate limit exceeded when updating activity description')
      throw new Error(ERROR_CODES.STRAVA_API_LIMIT_EXCEEDED)
    }

    console.error('Strava API: Failed to update activity description:', errorText)
    throw new Error(ERROR_CODES.STRAVA_ACTIVITY_UPDATE_FAILED)
  }
}

// * 백그라운드에서 실행될 작업(스트라바 액세스 토큰 조회&갱신 / 활동 상세 정보 조회 / 활동 데이터 DB에 저장 / 랭킹 정보 계산 / 디스크립션 생성 / 스트라바 활동 업데이트)
export async function processWebhookEvent(body: StravaWebhookEventResponse) {
  try {
    const supabase = await createServiceRoleClient()

    // * 유저의 스트라바 엑세스 토큰 조회
    const { data: stravaConnection } = await supabase
      .from('strava_user_tokens')
      .select('access_token, refresh_token, expires_at, user_id')
      .eq('strava_athlete_id', body.owner_id.toString())
      .maybeSingle()

    if (!stravaConnection) {
      logError('Strava Webhook: strava_user_tokens table에서 데이터를 찾을 수 없습니다.', {
        owner_id: body.owner_id,
        owner_id_string: body.owner_id.toString(),
      })
      return
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
        return
      }
      console.error('Strava Webhook: Failed to fetch activity:', await response.text())
      return
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
      logError('Strava Webhook: Failed to increment API usage:', incrementPutAPIUsageError)
    }
  } catch (error) {
    logError('Background webhook processing error:', { error })
    throw Error(ERROR_CODES.STRAVA_ACTIVITY_UPDATE_FAILED)
  }
}
