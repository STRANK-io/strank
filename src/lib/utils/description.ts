import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { StravaActivity } from '@/lib/types/strava'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'

/**
 * moving time 기준 평균 파워 계산
 */
function calculateMovingAverageWatts(streamsData: any): number | undefined {
  if (!streamsData?.watts?.data || !streamsData?.moving?.data) return undefined

  const watts: number[] = streamsData.watts.data
  const moving: boolean[] = streamsData.moving.data

  if (!watts || !moving || watts.length !== moving.length) return undefined

  const movingWatts = watts.filter((_, i) => moving[i])
  if (movingWatts.length === 0) return undefined

  return Math.round(movingWatts.reduce((a, b) => a + b, 0) / movingWatts.length)
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

    // ✅ 평균 파워: moving 기준 → 없으면 weighted_average_watts → 마지막 fallback average_watts
    const avgWatts =
      calculateMovingAverageWatts(streamsData) ??
      (activity as any).weighted_average_watts ??
      activity.average_watts

    // GPT로 설명 생성
    const description = await generateActivityDescriptionWithGPT(
      {
        date: activity.start_date_local,
        distance: (activity.distance || 0) / 1000,
        elevation: activity.total_elevation_gain || 0,
        averageSpeed: (activity.average_speed || 0) * 3.6,
        maxSpeed: (activity.max_speed || 0) * 3.6,
        averageWatts: avgWatts, // ✅ 이제 91W가 여기 들어감
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

  // ✅ 디스크립션 출력에서도 moving 기준 avgWatts 사용
  const avgWatts = (activity as any).calculated_moving_avg_watts ?? (activity as any).weighted_average_watts ?? activity.average_watts

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
