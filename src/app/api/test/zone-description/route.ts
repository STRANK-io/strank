import { NextResponse } from 'next/server'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL, STRAVA_VISIBILITY } from '@/lib/constants/strava'
import { StravaActivity } from '@/lib/types/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { generateActivityDescription } from '@/lib/utils/description'
import { calculateActivityRanking } from '@/lib/utils/webhook'
import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const maxDuration = 300

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const activityId = searchParams.get('activityId')
    const userId = searchParams.get('userId')

    if (!token || !activityId || !userId) {
      return NextResponse.json(
        { success: false, error: 'token, activityId, userId가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('\n🚀 디스크립션 생성 테스트 시작...')

    // 실제 활동 데이터 가져오기
    const response = await fetch(
      `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(parseInt(activityId))}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
      }
      throw new Error('Failed to fetch activity: ' + await response.text())
    }

    const activity: StravaActivity = await response.json()

    let rankingsWithDistrict: CalculateActivityRankingReturn | null = null

    const isEveryone = activity.visibility === STRAVA_VISIBILITY.EVERYONE
    // * 랭킹 정보 계산
    // activity.visibility가 everyone이 아닌 경우는 랭킹 데이터 계산 생략 및 디스크립션에 넣지 않음
    if (isEveryone) {
      const supabase = await createServiceRoleClient()
      rankingsWithDistrict = await calculateActivityRanking(activity, userId, supabase)
    }

    const description = await generateActivityDescription(
      activity,
      userId,
      rankingsWithDistrict,
      token
    )

    return NextResponse.json({
      success: true,
      data: {
        description: description
      }
    })
  } catch (error) {
    console.error('\n❌ 디스크립션 생성 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
