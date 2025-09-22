import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { StravaActivity } from '@/lib/types/strava'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'

/**
 * -------------------------------------------------------------
 * STRANK: Activity Description Generator (Vercel-ready)
 * - Strava 평균파워(이동 + 0W 포함 ≒ 91W) 방식으로 계산 적용
 * - streams fetch 시 moving 포함
 * - GPT 실패 시 fallback에서도 동일 평균파워 사용 가능
 * -------------------------------------------------------------
 */

// ===== Streams typing =====
export type StravaStream = {
  data: any[]
  series_type?: string
  original_size?: number
  resolution?: string
}
export type StreamsByType = Record<string, StravaStream | undefined> | null | undefined

// ===== Utilities =====
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/**
 * Strava 평균파워 방식 구현:
 *  - 이동 구간(moving=true)만 대상
 *  - 0W(코스팅) 포함하여 평균
 *  - moving 스트림이 없으면 velocity_smooth(>0.5 m/s)로 이동 판정
 */
export function computeAvgPowerMovingIncludingZeros(streams: StreamsByType): number | undefined {
  if (!streams) return undefined
  const watts = streams.watts?.data as number[] | undefined
  if (!watts || watts.length === 0) return undefined

  const N = watts.length
  const movingRaw = streams.moving?.data as (number[] | boolean[] | undefined)
  const speed = streams.velocity_smooth?.data as number[] | undefined

  let movingMask: boolean[]
  if (movingRaw && movingRaw.length === N) {
    movingMask = (movingRaw as Array<number | boolean>).map((v) => Boolean(v))
  } else if (speed && speed.length === N) {
    // fallback: 속도 기반 이동 판정(≈ 내부 동작 근사)
    movingMask = speed.map((s) => (isFiniteNumber(s) ? s : 0) > 0.5)
  } else {
    movingMask = Array(N).fill(true)
  }

  let sum = 0
  let cnt = 0
  for (let i = 0; i < N; i++) {
    if (movingMask[i]) {
      const w = isFiniteNumber(watts[i]) ? watts[i] : 0
      sum += w // 0W 포함!
      cnt++
    }
  }
  if (cnt === 0) return undefined
  return sum / cnt
}

/** Fetch Streams (key_by_type=true) */
async function fetchStreams(activityId: number | string, accessToken: string): Promise<StreamsByType> {
  const keys = [
    'time',
    'latlng',
    'distance',
    'altitude',
    'velocity_smooth',
    'heartrate',
    'watts',
    'cadence',
    'grade_smooth',
    'moving', // ★ 중요: moving 추가
  ].join(',')

  const url = `${STRAVA_API_URL}/activities/${activityId}/streams?keys=${keys}&key_by_type=true`
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) {
      const body = await res.text()
      console.log('⚠️ 스트림 데이터 가져오기 실패', { status: res.status, body })
      return null
    }
    const json = await res.json()
    console.log('✅ 스트림 데이터 가져오기 성공')
    return json as StreamsByType
  } catch (e) {
    console.log('⚠️ 스트림 요청 오류', e)
    return null
  }
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
    console.log('\n📡 스트림 데이터 가져오는 중...')
    const streamsData = await fetchStreams(activity.id, accessToken)

    // 이동 + 0W 포함(= Strava 평균파워) 계산
    const avgPowerMovingZeros = computeAvgPowerMovingIncludingZeros(streamsData)

    // GPT 프롬프트에 우선 적용(없으면 activity.average_watts)
    const description = await generateActivityDescriptionWithGPT(
      {
        date: activity.start_date_local,
        distance: (activity.distance || 0) / 1000,
        elevation: activity.total_elevation_gain || 0,
        averageSpeed: (activity.average_speed || 0) * 3.6,
        maxSpeed: (activity.max_speed || 0) * 3.6,
        averageWatts:
          (isFiniteNumber(avgPowerMovingZeros) && avgPowerMovingZeros > 0
            ? avgPowerMovingZeros
            : undefined) ??
          (isFiniteNumber(activity.average_watts) && activity.average_watts > 0
            ? activity.average_watts
            : undefined),
        maxWatts:
          isFiniteNumber(activity.max_watts) && activity.max_watts > 0
            ? activity.max_watts
            : undefined,
        maxHeartrate:
          isFiniteNumber(activity.max_heartrate) && activity.max_heartrate > 0
            ? activity.max_heartrate
            : undefined,
        averageCadence:
          isFiniteNumber(activity.average_cadence) && activity.average_cadence > 0
            ? activity.average_cadence
            : undefined,
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
    // 실패 시 기본 디스크립션
    return generateBasicDescription(activity, rankingsWithDistrict)
  }
}

/**
 * 기본 디스크립션 (GPT 실패 시)
 */
function generateBasicDescription(
  activity: StravaActivity,
  rankingsWithDistrict: CalculateActivityRankingReturn | null,
  override?: { averageWatts?: number }
): string {
  const sections = [
    generateDateSection(activity.start_date_local),
    generateRankingSection(rankingsWithDistrict),
    generateAnalysisSection(activity, override),
  ]
  return sections.filter(Boolean).join('\n\n')
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
  const sections: string[] = []

  if (rankings.distanceRankCity || rankings.distanceRankDistrict) {
    sections.push(
      `🥇 거리 랭킹${
        rankings.distanceRankCity ? `\n📍${province} (${rankings.distanceRankCity}위)` : ''
      }${
        rankings.distanceRankDistrict ? `\n📍${district} (${rankings.distanceRankDistrict}위)` : ''
      }`
    )
  }
  if (rankings.elevationRankCity || rankings.elevationRankDistrict) {
    sections.push(
      `🧗 고도 랭킹${
        rankings.elevationRankCity ? `\n📍${province} (${rankings.elevationRankCity}위)` : ''
      }${
        rankings.elevationRankDistrict ? `\n📍${district} (${rankings.elevationRankDistrict}위)` : ''
      }`
    )
  }
  return sections.join('\n\n')
}

function generateAnalysisSection(
  activity: StravaActivity,
  override?: { averageWatts?: number }
): string {
  const {
    distance = 0,
    total_elevation_gain = 0,
    average_speed = 0,
    max_speed = 0,
    max_watts = 0,
    max_heartrate = 0,
    average_cadence = 0,
  } = activity

  // 평균파워 오버라이드가 있으면 우선 사용
  const average_watts = override?.averageWatts ?? (activity as any).average_watts ?? 0

  const metrics: Array<[string, string, string]> = [
    ['🚴총거리', formatActivityValue(distance, 'distance'), ACTIVITY_UNITS.DISTANCE],
    ['🚵 총고도', formatActivityValue(total_elevation_gain), ACTIVITY_UNITS.ELEVATION],
    ['🪫평균속도', formatActivityValue(average_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ['🔋최고속도', formatActivityValue(max_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ...(average_watts && average_watts >= 1
      ? ([[
          '🦵평균파워',
          formatActivityValue(average_watts),
          ACTIVITY_UNITS.POWER,
        ]] as Array<[string, string, string]>)
      : []),
    ...(max_watts && max_watts >= 1
      ? ([[
          '🦿최대파워',
          formatActivityValue(max_watts),
          ACTIVITY_UNITS.POWER,
        ]] as Array<[string, string, string]>)
      : []),
    ...(max_heartrate && max_heartrate >= 1
      ? ([[
          '❤️최고심박수',
          formatActivityValue(max_heartrate),
          ACTIVITY_UNITS.HEART_RATE,
        ]] as Array<[string, string, string]>)
      : []),
    ...(average_cadence && average_cadence >= 1
      ? ([[
          '💫평균케이던스',
          formatActivityValue(average_cadence),
          ACTIVITY_UNITS.CADENCE,
        ]] as Array<[string, string, string]>)
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

/**
 * (옵션) 서버 핸들러/액션 예시 - Vercel Edge/Node 양쪽에서 사용 가능
 * 필요 시 프로젝트 라우터에 맞춰 가져다 쓰세요.
 */
export async function generateAndUpdate(
  accessToken: string,
  activity: StravaActivity,
  rankingsWithDistrict: CalculateActivityRankingReturn | null
) {
  const description = await generateActivityDescription(activity, rankingsWithDistrict, accessToken)
  await updateStravaActivityDescription(accessToken, activity, description)
  return description
}
