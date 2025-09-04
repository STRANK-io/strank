import { NextResponse } from 'next/server'
import { STRAVA_API_URL, STRAVA_ACTIVITY_BY_ID_ENDPOINT } from '@/lib/constants/strava'
import { StravaActivity } from '@/lib/types/strava'
import { fetchStravaActivityStreams } from '@/lib/utils/strava'

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

    // 스트림 데이터 가져오기
    console.log('\n📡 스트림 데이터 가져오는 중...')
    let streamsData = null
    
    try {
      streamsData = await fetchStravaActivityStreams(
        parseInt(activityId),
        accessToken,
        ['time', 'latlng', 'distance', 'altitude', 'velocity_smooth', 'heartrate', 'watts', 'cadence', 'grade_smooth']
      )
      console.log('✅ 스트림 데이터 가져오기 성공:', {
        availableKeys: Object.keys(streamsData),
        totalDataPoints: Object.values(streamsData).reduce((total, stream) => {
          return total + (stream?.data?.length || 0)
        }, 0),
      })
    } catch (streamError) {
      console.log('⚠️ 스트림 데이터 가져오기 실패:', streamError)
      console.log('ℹ️ 스트림 데이터 없이 계속 진행...')
    }

    // 스트림 데이터를 기반으로 더 정확한 액티비티 데이터 생성
    let enhancedActivityData = {
      name: `GPT TEST ${sourceActivity.name} ${new Date().toLocaleTimeString()}`,
      type: sourceActivity.type,
      sport_type: sourceActivity.sport_type,
      start_date: new Date().toISOString(), // 현재 시간 사용
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

    // 스트림 데이터가 있으면 더 정확한 통계로 업데이트
    if (streamsData) {
      console.log('\n📊 스트림 데이터 기반 통계 계산 중...')
      
      // 거리 데이터가 있으면 총 거리 업데이트
      if (streamsData.distance && streamsData.distance.data.length > 0) {
        const totalDistance = streamsData.distance.data[streamsData.distance.data.length - 1]
        enhancedActivityData.distance = totalDistance
        console.log('✅ 스트림 기반 거리 업데이트:', totalDistance)
      }

      // 고도 데이터가 있으면 총 고도 업데이트
      if (streamsData.altitude && streamsData.altitude.data.length > 0) {
        const altitudeData = streamsData.altitude.data
        const elevationGain = Math.max(...altitudeData) - Math.min(...altitudeData)
        enhancedActivityData.total_elevation_gain = elevationGain
        console.log('✅ 스트림 기반 고도 업데이트:', elevationGain)
      }

      // 속도 데이터가 있으면 평균/최대 속도 업데이트
      if (streamsData.velocity_smooth && streamsData.velocity_smooth.data.length > 0) {
        const velocityData = streamsData.velocity_smooth.data
        const avgSpeed = velocityData.reduce((sum, v) => sum + v, 0) / velocityData.length
        const maxSpeed = Math.max(...velocityData)
        enhancedActivityData.average_speed = avgSpeed
        enhancedActivityData.max_speed = maxSpeed
        console.log('✅ 스트림 기반 속도 업데이트:', { avgSpeed, maxSpeed })
      }

      // 파워 데이터가 있으면 파워 통계 업데이트
      if (streamsData.watts && streamsData.watts.data.length > 0) {
        const wattsData = streamsData.watts.data.filter(w => w > 0)
        if (wattsData.length > 0) {
          const avgWatts = wattsData.reduce((sum, w) => sum + w, 0) / wattsData.length
          const maxWatts = Math.max(...wattsData)
          enhancedActivityData.average_watts = avgWatts
          enhancedActivityData.max_watts = maxWatts
          console.log('✅ 스트림 기반 파워 업데이트:', { avgWatts, maxWatts })
        }
      }

      // 심박수 데이터가 있으면 심박수 통계 업데이트
      if (streamsData.heartrate && streamsData.heartrate.data.length > 0) {
        const hrData = streamsData.heartrate.data.filter(hr => hr > 0)
        if (hrData.length > 0) {
          const avgHr = hrData.reduce((sum, hr) => sum + hr, 0) / hrData.length
          const maxHr = Math.max(...hrData)
          enhancedActivityData.average_heartrate = avgHr
          enhancedActivityData.max_heartrate = maxHr
          console.log('✅ 스트림 기반 심박수 업데이트:', { avgHr, maxHr })
        }
      }

      // 케이던스 데이터가 있으면 케이던스 통계 업데이트
      if (streamsData.cadence && streamsData.cadence.data.length > 0) {
        const cadenceData = streamsData.cadence.data.filter(c => c > 0)
        if (cadenceData.length > 0) {
          const avgCadence = cadenceData.reduce((sum, c) => sum + c, 0) / cadenceData.length
          enhancedActivityData.average_cadence = avgCadence
          console.log('✅ 스트림 기반 케이던스 업데이트:', avgCadence)
        }
      }
    }

    const testActivity = enhancedActivityData

    console.log('\n📊 업로드할 활동 데이터:', {
      name: testActivity.name,
      distance: testActivity.distance,
      elevation: testActivity.total_elevation_gain,
      start_date: testActivity.start_date,
      current_time: new Date().toISOString(),
      full_data: testActivity
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
      const errorText = await createResponse.text()
      console.error('Strava API 응답:', {
        status: createResponse.status,
        statusText: createResponse.statusText,
        error: errorText
      })
      throw new Error('Failed to create activity: ' + errorText)
    }

    const createdActivity = await createResponse.json()

    console.log('\n✅ 활동 업로드 완료:', {
      id: createdActivity.id,
      name: createdActivity.name,
      hasStreamsData: !!streamsData,
      streamsDataKeys: streamsData ? Object.keys(streamsData) : [],
    })

    return NextResponse.json({
      success: true,
      activity: {
        id: createdActivity.id,
        name: createdActivity.name,
      },
      streamsData: streamsData ? {
        availableKeys: Object.keys(streamsData),
        totalDataPoints: Object.values(streamsData).reduce((total, stream) => {
          return total + (stream?.data?.length || 0)
        }, 0),
      } : null
    })
  } catch (error) {
    console.error('\n❌ 활동 업로드 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
} 