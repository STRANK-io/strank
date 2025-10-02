import { NextResponse } from 'next/server'
import { analyzeStreamData } from '@/lib/utils/streamAnalyzer'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { StravaActivity } from '@/lib/types/strava'
import { ERROR_CODES } from '@/lib/constants/error'

export const maxDuration = 300

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const activityId = searchParams.get('activityId')
    const userId = searchParams.get('userId')?.toString()

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

    // 스트림 데이터 가져오기
    console.log('\n📡 스트림 데이터 가져오는 중...')
    const streamsResponse = await fetch(
      `${STRAVA_API_URL}/activities/${activityId}/streams?keys=time,latlng,distance,altitude,velocity_smooth,heartrate,watts,cadence,grade_smooth&key_by_type=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    let streamsData = null
    if (streamsResponse.ok) {
      streamsData = await streamsResponse.json()
      console.log('✅ 스트림 데이터 가져오기 성공')
    } else {
      console.log('⚠️ 스트림 데이터 가져오기 실패:', streamsResponse.status)
    }

    console.log('\n📊 활동 데이터:', {
      id: activity.id,
      name: activity.name,
      distance: activity.distance,
      elevation: activity.total_elevation_gain,
    })

    const description = await analyzeStreamData(userId, streamsData);

    const powerZoneRatios = description.powerZoneRatios
    const hrZoneRatios = description.hrZoneRatios

    // 결과 비교 분석
    return NextResponse.json({
      success: true,
      data: {
        zoneAnalysis: {
          파워존분포: {
            "Z1 (회복)": `${powerZoneRatios.Z1}%`,
            "Z2 (지구력)": `${powerZoneRatios.Z2}%`,
            "Z3 (템포)": `${powerZoneRatios.Z3}%`,
            "Z4 (역치)": `${powerZoneRatios.Z4}%`,
            "Z5 (VO2max)": `${powerZoneRatios.Z5}%`,
            "Z6 (무산소)": `${powerZoneRatios.Z6}%`,
            "Z7 (신경근)": `${powerZoneRatios.Z7}%`
          },
          심박존분포: {
            "Z1 (회복)": `${hrZoneRatios.Z1}%`,
            "Z2 (지구력)": `${hrZoneRatios.Z2}%`,
            "Z3 (템포)": `${hrZoneRatios.Z3}%`,
            "Z4 (역치)": `${hrZoneRatios.Z4}%`,
            "Z5 (무산소)": `${hrZoneRatios.Z5}%`
          }
        }
      }
    })
  } catch (error) {
    console.error('\n❌ 디스크립션 생성 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
