import { NextResponse } from 'next/server'
import { updateStravaActivityDescription } from '@/lib/utils/description'
import { StravaActivity } from '@/lib/types/strava'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'

// 테스트 엔드포인트는 인증을 우회합니다
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // URL에서 액세스 토큰과 활동 ID를 가져옵니다
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('token')
    const activityId = searchParams.get('activityId')

    if (!accessToken || !activityId) {
      return NextResponse.json(
        { success: false, error: 'token과 activityId가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('🚀 스트라바 업데이트 테스트 시작...')

    // 실제 활동 데이터 가져오기
    const response = await fetch(
      `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(parseInt(activityId))}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
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

    console.log('\n📊 활동 데이터:', {
      id: activity.id,
      name: activity.name,
      distance: activity.distance,
      elevation: activity.total_elevation_gain,
    })

    // OpenAI를 사용하여 디스크립션 생성
    const description = await generateActivityDescriptionWithGPT(
      {
        date: activity.start_date,
        distance: activity.distance || 0,
        elevation: activity.total_elevation_gain || 0,
        averageSpeed: (activity.average_speed || 0) * 3.6,
        maxSpeed: (activity.max_speed || 0) * 3.6,
        averageWatts: activity.average_watts || undefined,
        maxWatts: activity.max_watts || undefined,
        maxHeartrate: activity.max_heartrate || undefined,
        averageCadence: activity.average_cadence || undefined,
      },
      {
        distanceRankCity: 84,
        distanceRankDistrict: 9,
        elevationRankCity: 89,
        elevationRankDistrict: 9,
        district: '구로구',
        province: '서울시',
      }
    )

    console.log('\n📝 생성된 디스크립션:', description)

    // 스트라바 업데이트
    await updateStravaActivityDescription(accessToken, activity, description)

    console.log('\n✅ 스트라바 업데이트 완료')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('\n❌ 스트라바 업데이트 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
