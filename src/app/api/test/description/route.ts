import { NextResponse } from 'next/server'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { StravaActivity } from '@/lib/types/strava'
import { ERROR_CODES } from '@/lib/constants/error'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const activityId = searchParams.get('activityId')

    if (!token || !activityId) {
      return NextResponse.json(
        { success: false, error: 'token과 activityId가 필요합니다.' },
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

    console.log('\n📊 활동 데이터:', {
      id: activity.id,
      name: activity.name,
      distance: activity.distance,
      elevation: activity.total_elevation_gain,
    })

    // 디스크립션 생성
    const description = await generateActivityDescriptionWithGPT(
      {
        date: activity.start_date_local,
        distance: (activity.distance || 0) / 1000, // m를 km로 변환
        elevation: activity.total_elevation_gain || 0,
        averageSpeed: (activity.average_speed || 0) * 3.6, // m/s를 km/h로 변환
        maxSpeed: (activity.max_speed || 0) * 3.6, // m/s를 km/h로 변환
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
        district: '신사동',
      }
    )

    // 디스크립션을 섹션별로 분리하여 포맷팅
    const sections = description.split('\n\n')
    const formattedDescription = sections.map(section => section.trim()).join('\n\n')

    console.log('\n✅ 생성된 디스크립션:')
    console.log(formattedDescription)

    return NextResponse.json({
      success: true,
      data: {
        description: formattedDescription,
        sections: sections.map(section => section.trim())
      }
    })
  } catch (error) {
    console.error('\n❌ 디스크립션 생성 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
