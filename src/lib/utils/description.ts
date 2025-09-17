import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { StravaActivity } from '@/lib/types/strava'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'

// =============================================
// 1) AI 기반 디스크립션 생성
// =============================================
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

    return description
  } catch (error) {
    logError('디스크립션 생성 중 오류 발생:', { error, functionName: 'generateActivityDescription' })
    return generateBasicDescription(activity, rankingsWithDistrict)
  }
}

// =============================================
// 2) 기본 디스크립션 (fallback)
// =============================================
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

  return `◾ 라이딩 분석 정보 ◾\n${metrics
    .map(([label, value, unit]) => `${label} : ${value} ${unit}`)
    .join('\n')}\n\n🏆 Powered by STRANK`
}

// =============================================
// 3) 디스크립션 업데이트 (라이덕 스타일 + 개선)
// =============================================
export async function updateStravaActivityDescription(
  accessToken: string,
  stravaActivity: StravaActivity,
  strankDescription: string
): Promise<void> {
  // 1) 텍스트 클린업
  let cleanDescription = strankDescription
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // 보이지 않는 문자 제거
    .replace(/\n{3,}/g, '\n\n') // 과도한 줄바꿈 정리

  if (cleanDescription.length > 1999) {
    cleanDescription = cleanDescription.substring(0, 1999)
  }

  console.log('📤 디스크립션 업데이트 (overwrite mode):', {
    activityId: stravaActivity.id,
    length: cleanDescription.length,
    preview: cleanDescription.substring(0, 120),
  })

  // 2) PUT: STRANK 디스크립션만 덮어쓰기
  const updateResponse = await fetch(
    `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description: cleanDescription }),
    }
  )

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()
    if (updateResponse.status === 429) {
      throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
    }
    logError('Strava API: Failed to update activity description:', {
      error: errorText,
      functionName: 'updateStravaActivityDescription',
    })
    throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
  }

  // 3) PUT 응답을 그대로 사용 (최신 데이터)
  const updatedActivity: StravaActivity = await updateResponse.json()
  console.log('✅ PUT 응답 최신 description:', updatedActivity.description?.substring(0, 120))

  // 4) GET 재호출 (옵션: include_all_efforts=false)
  const syncResponse = await fetch(
    `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}?include_all_efforts=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (syncResponse.ok) {
    const synced: StravaActivity = await syncResponse.json()
    console.log('🔄 동기화 완료, 최신 description:', synced.description?.substring(0, 120))
  } else {
    console.log('⚠️ 동기화 GET 실패:', syncResponse.status)
  }
}
