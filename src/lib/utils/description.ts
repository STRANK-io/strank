import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { StravaActivity } from '@/lib/types/strava'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'

/**
 * 스트랭크 디스크립션 포맷에 맞춰 활동 디스크립션을 생성하는 함수
 */
export async function generateActivityDescription(
  activity: StravaActivity,
  rankingsWithDistrict: CalculateActivityRankingReturn | null,
  accessToken: string
): Promise<string> {
  try {
    let streamsData = null
    try {
      const streamsUrl = `${STRAVA_API_URL}/activities/${activity.id}/streams?keys=time,latlng,distance,altitude,velocity_smooth,heartrate,watts,cadence,grade_smooth&key_by_type=true`
      const streamsResponse = await fetch(streamsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (streamsResponse.ok) {
        streamsData = await streamsResponse.json()
      } else {
        const errorText = await streamsResponse.text()
        logError('스트림 데이터 가져오기 실패', {
          status: streamsResponse.status,
          error: errorText,
          activityId: activity.id,
        })
      }
    } catch (err) {
      logError('스트림 데이터 요청 중 오류', { err, activityId: activity.id })
    }

    const description = await generateActivityDescriptionWithGPT(
      {
        date: activity.start_date_local,
        distance: (activity.distance || 0) / 1000,
        elevation: activity.total_elevation_gain || 0,
        averageSpeed: (activity.average_speed || 0) * 3.6,
        maxSpeed: (activity.max_speed || 0) * 3.6,
        averageWatts: activity.average_watts && activity.average_watts > 0 ? activity.average_watts : undefined,
        maxWatts: activity.max_watts && activity.max_watts > 0 ? activity.max_watts : undefined,
        maxHeartrate: activity.max_heartrate && activity.max_heartrate > 0 ? activity.max_heartrate : undefined,
        averageCadence: activity.average_cadence && activity.average_cadence > 0 ? activity.average_cadence : undefined,
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
    logError('디스크립션 생성 중 오류 발생', { error })
    return generateBasicDescription(activity, rankingsWithDistrict)
  }
}

/**
 * GPT 실패 시 기본 디스크립션 생성
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
  return sections.join('\n\n\n\n')
}

function generateDateSection(startDate: string): string {
  const date = new Date(startDate)
  const formattedDate = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return `🚴 STRANK AI 라이딩 리포트 (Pro)\n📅 ${formattedDate}`
}

/**
 * 랭킹 섹션
 */
export function generateRankingSection(
  rankingsWithDistrict: CalculateActivityRankingReturn | null
): string {
  if (!rankingsWithDistrict || !rankingsWithDistrict.rankings) return ''
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

/**
 * 분석 섹션
 */
function generateAnalysisSection(activity: StravaActivity): string {
  const {
    distance = 0,
    total_elevation_gain = 0,
    average_speed = 0,
    max_speed = 0,
    average_watts = 0,
    max_watts = 0,
    max_heartrate = 0,
    average_cadence = 0,
  } = activity

  const metrics = [
    ['🚴총거리', formatActivityValue(distance, 'distance'), ACTIVITY_UNITS.DISTANCE],
    ['🚵 총고도', formatActivityValue(total_elevation_gain), ACTIVITY_UNITS.ELEVATION],
    ['🪫평균속도', formatActivityValue(average_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ['🔋최고속도', formatActivityValue(max_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ...(average_watts! >= 1 ? [['🦵평균파워', formatActivityValue(average_watts), ACTIVITY_UNITS.POWER]] : []),
    ...(max_watts! >= 1 ? [['🦿최대파워', formatActivityValue(max_watts), ACTIVITY_UNITS.POWER]] : []),
    ...(max_heartrate! >= 1 ? [['❤️최고심박수', formatActivityValue(max_heartrate), ACTIVITY_UNITS.HEART_RATE]] : []),
    ...(average_cadence! >= 1 ? [['💫평균케이던스', formatActivityValue(average_cadence), ACTIVITY_UNITS.CADENCE]] : []),
  ]

  const analysisInfo = metrics.map(([label, value, unit]) => `${label} : ${value} ${unit}`).join('\n')

  return `◾ 라이딩 분석 정보 ◾
${analysisInfo}

🏆 Powered by STRANK`
}

/**
 * 스트라바 활동 디스크립션 업데이트
 */
export async function updateStravaActivityDescription(
  accessToken: string,
  stravaActivity: StravaActivity,
  strankDescription: string
): Promise<void> {
  console.log('🔄 디스크립션 업데이트 직전 최신 활동 데이터 조회 중...')

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
  const existingDesc = latestActivity.description ?? ''
  let combinedDescription =
    existingDesc.trim().length > 0
      ? `${strankDescription}\n\n${existingDesc}`
      : strankDescription

  // ✅ 길이 제한
  if (combinedDescription.length > 2000) {
    combinedDescription = combinedDescription.substring(0, 2000)
  }

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

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()
    logError('Strava API: Failed to update activity description', {
      status: updateResponse.status,
      error: errorText,
      activityId: stravaActivity.id,
      descriptionLength: combinedDescription.length,
    })

    if (updateResponse.status === 429) {
      throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
    }
    if (updateResponse.status === 401) {
      throw new Error('Unauthorized: token expired or invalid')
    }
    if (updateResponse.status === 400) {
      throw new Error('Bad Request: description too long or invalid body')
    }

    throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
  }

  console.log('✅ 디스크립션 업데이트 성공', { activityId: stravaActivity.id })
}
