import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { StravaActivity } from '@/lib/types/strava'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'

/**
 * description 안전 정화 함수
 */
function sanitizeDescription(desc: string): string {
  return desc
    .replace(/https?:\/\/\S+/g, '') // URL 제거
    .replace(/\b\w+\.(io|com|net|org)\b/gi, '') // 도메인 제거
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width 문자 제거
    .replace(/\u2028|\u2029/g, '\n') // 줄바꿈 제어문자 교체
    .replace(/\n{3,}/g, '\n\n') // 과도한 개행 정리
    .trim()
    .substring(0, 1500) // 안전하게 1500자 제한
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
    let streamsData = null
    try {
      const streamsUrl = `${STRAVA_API_URL}/activities/${activity.id}/streams?keys=time,latlng,distance,altitude,velocity_smooth,heartrate,watts,cadence,grade_smooth&key_by_type=true`
      const streamsResponse = await fetch(streamsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (streamsResponse.ok) {
        streamsData = await streamsResponse.json()
      }
    } catch (err) {
      console.log('⚠️ 스트림 데이터 가져오기 실패:', err)
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

    return sanitizeDescription(description)
  } catch (error) {
    logError('디스크립션 생성 중 오류 발생:', { error, functionName: 'generateActivityDescription' })
    return generateBasicDescription(activity, rankingsWithDistrict)
  }
}

/**
 * 기본 디스크립션 생성 함수 (ChatGPT API 호출 실패 시 사용)
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
  return sanitizeDescription(sections.join('\n\n\n\n'))
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
      `🧗 고도 랭킹${rankings.elevationRankCity ? `\n📍${province} (${rankings.elevationRankCity}위)` : ''}${
        rankings.elevationRankDistrict ? `\n📍${district} (${rankings.elevationRankDistrict}위)` : ''
      }`
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
    ...(max_heartrate! >= 1
      ? [['❤️최고심박수', formatActivityValue(max_heartrate), ACTIVITY_UNITS.HEART_RATE]]
      : []),
    ...(average_cadence! >= 1
      ? [['💫평균케이던스', formatActivityValue(average_cadence), ACTIVITY_UNITS.CADENCE]]
      : []),
  ]

  const analysisInfo = metrics.map(([label, value, unit]) => `${label} : ${value} ${unit}`).join('\n')
  return `◾ 라이딩 분석 정보 ◾
${analysisInfo}

🏆 Powered by STRANK`
}

/**
 * 스트라바 활동의 설명을 업데이트하는 함수
 */
export async function updateStravaActivityDescription(
  accessToken: string,
  stravaActivity: StravaActivity,
  strankDescription: string
): Promise<void> {
  try {
    // 기존 + 새 STRANK 설명 병합
    const latestActivityResponse = await fetch(
      `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!latestActivityResponse.ok) {
      const errorText = await latestActivityResponse.text()
      logError('최신 활동 데이터 조회 실패:', {
        error: errorText,
        functionName: 'updateStravaActivityDescription',
      })
      throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
    }

    const latestActivity: StravaActivity = await latestActivityResponse.json()

    let combinedDescription: string
    if (latestActivity.description && latestActivity.description.trim().length > 0) {
      combinedDescription = `${strankDescription}\n\n${latestActivity.description}`
    } else {
      combinedDescription = strankDescription
    }

    const safeDescription = sanitizeDescription(combinedDescription)

    const updateResponse = await fetch(
      `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: safeDescription }),
      }
    )

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      if (updateResponse.status === 429) {
        throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
      }
      logError('Strava API: Failed to update activity description', {
        error: errorText,
        functionName: 'updateStravaActivityDescription',
      })
      throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
    }

    const updatedActivity: StravaActivity = await updateResponse.json()
    console.log('✅ 최종 저장된 description:', updatedActivity.description?.substring(0, 120))
  } catch (err) {
    logError('updateStravaActivityDescription 실행 중 오류', {
      error: err,
      functionName: 'updateStravaActivityDescription',
    })
    throw err
  }
}
