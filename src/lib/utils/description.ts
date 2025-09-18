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
    console.log('\n📡 스트림 데이터 가져오는 중...')
    let streamsData = null

    try {
      const streamsUrl = `${STRAVA_API_URL}/activities/${activity.id}/streams?keys=time,latlng,distance,altitude,velocity_smooth,heartrate,watts,cadence,grade_smooth&key_by_type=true`
      const streamsResponse = await fetch(streamsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (streamsResponse.ok) {
        streamsData = await streamsResponse.json()
        console.log('✅ 스트림 데이터 가져오기 성공')
      } else {
        console.log('⚠️ 스트림 데이터 가져오기 실패:', streamsResponse.status)
      }
    } catch (err) {
      console.log('⚠️ 스트림 데이터 오류:', err)
    }

    // ChatGPT API를 통해 디스크립션 생성
    const description = await generateActivityDescriptionWithGPT(
      {
        date: activity.start_date_local,
        distance: (activity.distance || 0) / 1000,
        elevation: activity.total_elevation_gain || 0,
        averageSpeed: (activity.average_speed || 0) * 3.6,
        maxSpeed: (activity.max_speed || 0) * 3.6,
        averageWatts: activity.average_watts ?? undefined,
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
    logError('디스크립션 생성 중 오류 발생:', { error })
    return generateBasicDescription(activity, rankingsWithDistrict)
  }
}

/**
 * 기본 디스크립션 생성 함수 (ChatGPT 실패 시)
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
 * 분석 섹션 생성 함수
 */
function generateAnalysisSection(activity: StravaActivity): string {
  const {
    distance = 0,
    total_elevation_gain = 0,
    average_speed = 0,
    max_speed = 0,
    average_watts,
    max_watts,
    max_heartrate,
    average_cadence,
  } = activity

  const safeAvgWatts = average_watts ?? 0
  const safeMaxWatts = max_watts ?? 0
  const safeMaxHeartrate = max_heartrate ?? 0
  const safeAvgCadence = average_cadence ?? 0

  const metrics = [
    ['🚴총거리', formatActivityValue(distance, 'distance'), ACTIVITY_UNITS.DISTANCE],
    ['🚵 총고도', formatActivityValue(total_elevation_gain), ACTIVITY_UNITS.ELEVATION],
    ['🪫평균속도', formatActivityValue(average_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ['🔋최고속도', formatActivityValue(max_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ...(safeAvgWatts >= 1
      ? [['🦵평균파워', formatActivityValue(safeAvgWatts), ACTIVITY_UNITS.POWER]]
      : []),
    ...(safeMaxWatts >= 1
      ? [['🦿최대파워', formatActivityValue(safeMaxWatts), ACTIVITY_UNITS.POWER]]
      : []),
    ...(safeMaxHeartrate >= 1
      ? [['❤️최고심박수', formatActivityValue(safeMaxHeartrate), ACTIVITY_UNITS.HEART_RATE]]
      : []),
    ...(safeAvgCadence >= 1
      ? [['💫평균케이던스', formatActivityValue(safeAvgCadence), ACTIVITY_UNITS.CADENCE]]
      : []),
  ]

  const analysisInfo = metrics.map(([label, value, unit]) => `${label} : ${value} ${unit}`).join('\n')
  return `◾ 라이딩 분석 정보 ◾
${analysisInfo}

🏆 Powered by STRANK`
}

/**
 * 안전한 PUT 요청 (재시도 포함)
 */
async function safeUpdateDescription(
  url: string,
  accessToken: string,
  description: string,
  retries = 1
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    })

    if (res.ok) {
      return await res.json()
    }

    const errorText = await res.text()
    console.log(`❌ 업데이트 실패 (시도 ${attempt + 1}):`, errorText)

    if (attempt < retries) {
      const wait = 2000 * (attempt + 1)
      console.log(`⏳ ${wait / 1000}초 후 재시도...`)
      await new Promise((r) => setTimeout(r, wait))
      continue
    }

    throw new Error('최종 업데이트 실패')
  }
}

/**
 * 스트라바 활동의 설명을 업데이트하는 함수
 *
 * - 1단계: "🏆 STRANK Writing..." 플레이스홀더 기록
 * - 3초 대기
 * - 2단계: 최종 디스크립션 업데이트 (실패 시 1회 재시도)
 */
export async function updateStravaActivityDescription(
  accessToken: string,
  stravaActivity: StravaActivity,
  strankDescription: string
): Promise<void> {
  const url = `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}`

  // 1단계
  console.log('✍️ [1단계] 플레이스홀더 업데이트 실행...')
  await safeUpdateDescription(url, accessToken, '🏆 STRANK Writing...')

  // 대기
  console.log('⏳ 3초 대기 후 최종 업데이트 실행 예정...')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 2단계
  console.log('✍️ [2단계] 최종 디스크립션 업데이트 실행...')
  await safeUpdateDescription(url, accessToken, strankDescription, 1)

  console.log('✅ 최종 디스크립션 업데이트 완료')
}
