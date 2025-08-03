import { NextResponse } from 'next/server'
import { STRAVA_API_URL, STRAVA_ACTIVITY_BY_ID_ENDPOINT } from '@/lib/constants/strava'
import { StravaActivity } from '@/lib/types/strava'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('accessToken')
    const activityId = searchParams.get('activityId')

    if (!accessToken || !activityId) {
      return NextResponse.json(
        { success: false, error: 'accessToken과 activityId가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('🚀 활동 업로드 테스트 시작...')

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
      throw new Error('Failed to fetch activity: ' + await response.text())
    }

    const sourceActivity: StravaActivity = await response.json()

    // 새로운 활동 데이터 생성
    const testActivity = {
      name: `GPT TEST ${sourceActivity.name}`,
      type: sourceActivity.type,
      sport_type: sourceActivity.sport_type,
      start_date: new Date('2025-08-04T02:00:00Z').toISOString(), // 현재 시간으로 고정
      elapsed_time: sourceActivity.elapsed_time,
      moving_time: sourceActivity.moving_time,
      description: '',
      distance: sourceActivity.distance,
      total_elevation_gain: sourceActivity.total_elevation_gain,
      average_speed: sourceActivity.average_speed,
      max_speed: sourceActivity.max_speed,
      average_watts: sourceActivity.average_watts,
      weighted_average_watts: sourceActivity.weighted_average_watts,
      max_watts: sourceActivity.max_watts,
      average_heartrate: sourceActivity.average_heartrate,
      max_heartrate: sourceActivity.max_heartrate,
      average_cadence: sourceActivity.average_cadence,
      trainer: sourceActivity.trainer ? 1 : 0,
      commute: sourceActivity.commute ? 1 : 0,
      hide_from_home: false,
      visibility: 'everyone',
      calories: sourceActivity.calories,
    }

    console.log('\n📊 업로드할 활동 데이터:', {
      name: testActivity.name,
      distance: testActivity.distance,
      elevation: testActivity.total_elevation_gain,
      start_date: testActivity.start_date,
      current_time: new Date().toISOString(),
    })

    // 스트라바 API를 통해 활동 생성
    const createResponse = await fetch(`${STRAVA_API_URL}/activities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testActivity),
    })

    if (!createResponse.ok) {
      throw new Error('Failed to create activity: ' + await createResponse.text())
    }

    const createdActivity = await createResponse.json()

    console.log('\n✅ 활동 업로드 완료:', {
      id: createdActivity.id,
      name: createdActivity.name,
    })

    return NextResponse.json({
      success: true,
      activity: {
        id: createdActivity.id,
        name: createdActivity.name,
      }
    })
  } catch (error) {
    console.error('\n❌ 활동 업로드 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
} 