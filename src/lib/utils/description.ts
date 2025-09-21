import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { StravaActivity } from '@/lib/types/strava'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'

/**
 * ✅ Strava 앱과 동일한 방식:
 * moving=true인 순간들의 watts만 단순 평균
 */
function calculateAverageWatts(streamsData: any): number | undefined {
  if (!streamsData?.watts?.data || !streamsData?.moving?.data) return undefined

  const watts: number[] = streamsData.watts.data
  const moving: boolean[] = streamsData.moving.data

  if (!watts.length || watts.length !== moving.length) return undefined

  const movingWatts = watts.filter((_, i) => moving[i])
  if (movingWatts.length === 0) return undefined

  return Math.round(
    movingWatts.reduce((a, b) => a + b, 0) / movingWatts.length
  )
}

/**
 * 스트랭크 디스크립션 포맷에 맞춰 활동 디스크립션을 생성하는 함수
 */
export async function generateActivityDescription(
  activity: StravaActivity,
  rankingsWithDistrict: CalculateActivityRankingReturn | null,
  accessToken: string
): Promise<string> {
  try {
    // 스트림 데이터 가져오기
    console.log('\n📡 스트림 데이터 가져오는 중...')
    let streamsData: any = null

    try {
      const streamsUrl = `${STRAVA_API_URL}/activities/${activity.id}/streams?keys=time,latlng,distance,altitude,velocity_smooth,heartrate,watts,cadence,grade_smooth,moving&key_by_type=true`
      const streamsResponse = await fetch(streamsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (streamsResponse.ok) {
        streamsData = await streamsResponse.json()
        console.log('✅ 스트림 데이터 가져오기 성공')
      } else {
        console.log('⚠️ 스트림 데이터 가져오기 실패', {
          status: streamsResponse.status,
          body: await streamsResponse.text(),
        })
      }
    } catch (e) {
      console.log('⚠️ 스트림 요청 오류', e)
    }

    // ✅ 평균 파워: moving 기반 평균 → 없으면 average_watts
    const avgWatts: number | undefined =
      calculateAverageWatts(streamsData) ??
      (activity.average_watts ?? undefined)

    // 계산된 값을 activity에 저장 → generateAnalysisSection에서도 동일 사용
    ;(activity as any).calculated_avg_watts = avgWatts

    // GPT로 설명 생성
    const description = await generateActivityDescriptionWithGPT(
      {
        date: activity.start_date_local,
        distance: (activity.distance || 0) / 1000,
        elevation: activity.total_elevation_gain || 0,
        averageSpeed: (activity.average_speed || 0) * 3.6,
        maxSpeed: (activity.max_speed || 0) * 3.6,
        averageWatts: avgWatts, // ✅ 이제 91W 들어감
        maxWatts: activity.max_watts ?? undefined,
        maxHeartrate: activity.max_heartrate ?? undefined,
        averageCadence: activity.average_cadence ?? undefined,
        streamsData,
      },
      rankingsWithDistrict?.rankings
        ? {
            distanceRankCity: rankingsWithDistrict.rankings.distanceRankCity,
            distanceRankDistrict: rankingsWithDistrict.rankings.distanceRankDistrict,
            elevationRankCity: rankingsWithDistrict.rankings.elevationRankCity,
            elevationRankDistrict: rankingsWithDistrict.rankings.elevationRankDistrict,
            district: rankingsWithDistrict.district,
            province: rankingsWithDistrict.province,
          }
        : undefined
    )

    return description
  } catch (error) {
    logError('디스크립션 생성 중 오류', { error })
    return generateBasicDescription(activity, rankingsWithDistrict)
  }
}

/**
 * 기본 디스크립션 (GPT 실패 시)
 */
function generateBasicDescription(
  activity: StravaActivity,
  rankingsWithDistrict: CalculateActivityRankingReturn | null
): string {
  const sections = [
    generateDateSection(activity.start_date_local),
    generateRankingSection(rankingsWithDistrict),
    generateAnalysisSection(activity),
  ]
  return sections.join('\n\n')
}

function generateDateSection(startDate: string): string {
  const date = new Date(startDate)
  return `🚴 STRANK AI 라이딩 리포트 (Pro)\n📅 ${date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}`
}

export function generateRankingSection(
  rankingsWithDistrict: CalculateActivityRankingReturn | null
): string {
  if (!rankingsWithDistrict?.rankings) return ''
  const { rankings, district, province } = rankingsWithDistrict
  const sections = []
  if (rankings.distanceRankCity || rankings.distanceRankDistrict) {
    sections.push(
      `🥇 거리 랭킹${
        rankings.distanceRankCity ? `\n📍${province} (${rankings.distanceRankCity}위)` : ''
      }${rankings.distanceRankDistrict ? `\n📍${district} (${rankings.distanceRankDistrict}위)` : ''}`
    )
  }
  if (rankings.elevationRankCity || rankings.elevationRankDistrict) {
    sections.push(
      `🧗 고도 랭킹${
        rankings.elevationRankCity ? `\n📍${province} (${rankings.elevationRankCity}위)` : ''
      }${rankings.elevationRankDistrict ? `\n📍${district} (${rankings.elevationRankDistrict}위)` : ''}`
    )
  }
  return sections.join('\n\n')
}

function generateAnalysisSection(activity: StravaActivity): string {
  const {
    distance = 0,
    total_elevation_gain = 0,
    average_speed = 0,
    max_speed = 0,
    max_watts = 0,
    max_heartrate = 0,
    average_cadence = 0,
  } = activity

  // ✅ 디스크립션 출력에서도 moving 기반 평균 사용
  const avgWatts: number | undefined =
    (activity as any).calculated_avg_watts ?? (activity.average_watts ?? undefined)

  const metrics = [
    ['🚴총거리', formatActivityValue(distance, 'distance'), ACTIVITY_UNITS.DISTANCE],
    ['🚵 총고도', formatActivityValue(total_elevation_gain), ACTIVITY_UNITS.ELEVATION],
    ['🪫평균속도', formatActivityValue(average_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ['🔋최고속도', formatActivityValue(max_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ...(avgWatts && avgWatts >= 1
      ? [['🦵평균파워', formatActivityValue(avgWatts), ACTIVITY_UNITS.POWER]]
      : []),
    ...(max_watts && max_watts >= 1
      ? [['🦿최대파워', formatActivityValue(max_watts), ACTIVITY_UNITS.POWER]]
      : []),
    ...(max_heartrate && max_heartrate >= 1
      ? [['❤️최고심박수', formatActivityValue(max_heartrate), ACTIVITY_UNITS.HEART_RATE]]
      : []),
    ...(average_cadence && average_cadence >= 1
      ? [['💫평균케이던스', formatActivityValue(average_cadence), ACTIVITY_UNITS.CADENCE]]
      : []),
  ]

  return `◾ 라이딩 분석 정보 ◾\n${metrics
    .map(([label, value, unit]) => `${label} : ${value} ${unit}`)
    .join('\n')}\n\n🏆 Powered by STRANK`
}

/**
 * 🚨 업데이트 함수 (상세 로깅 포함)
 */
export async function updateStravaActivityDescription(
  accessToken: string,
  stravaActivity: StravaActivity,
  strankDescription: string
): Promise<void> {
  try {
    console.log('🔄 최신 활동 데이터 조회...')
    const latestActivityResponse = await fetch(
      `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!latestActivityResponse.ok) {
      const errorText = await latestActivityResponse.text()
      logError('최신 활동 데이터 조회 실패', {
        status: latestActivityResponse.status,
        error: errorText,
      })
      throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
    }

    const latestActivity: StravaActivity = await latestActivityResponse.json()
    const existingDescription = latestActivity.description?.trim() || ''
    const defaultPlaceholders = ['Morning Ride', 'Afternoon Ride', 'Evening Ride']
    const filteredDescription =
      existingDescription && !defaultPlaceholders.includes(existingDescription)
        ? existingDescription
        : ''

    const combinedDescription = filteredDescription
      ? `${strankDescription}\n\n${filteredDescription}`
      : strankDescription

    console.log('📤 최종 업데이트 요청', {
      activityId: stravaActivity.id,
      preview: combinedDescription.substring(0, 200) + '...',
    })

    const updateResponse = await fetch(
      `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: combinedDescription }),
      }
    )

    const responseText = await updateResponse.text()
    console.log('📡 Strava 응답', {
      status: updateResponse.status,
      statusText: updateResponse.statusText,
      headers: {
        ratelimitUsage: updateResponse.headers.get('x-ratelimit-usage'),
        ratelimitLimit: updateResponse.headers.get('x-ratelimit-limit'),
      },
      body: responseText.substring(0, 500),
    })

    if (!updateResponse.ok) {
      if (updateResponse.status === 429) {
        throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
      }
      throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
    }

    console.log('✅ 최종 업데이트 성공')
  } catch (error) {
    logError('디스크립션 업데이트 중 예외 발생', { error })
    throw error
  }
}
