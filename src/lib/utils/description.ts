import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { StravaActivity } from '@/lib/types/strava'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'

/**
 * 스트랭크 디스크립션 포맷에 맞춰 활동 디스크립션을 생성하는 함수

 * @param activity - 업데이트할 활동 데이터
 * @param rankingsWithDistrict - 업데이트할 활동의 랭킹 데이터
 *
 * @remarks
 * - STRANK.io와 같이 도메인으로 인식되는 텍스트는 스트라바에서 표시되지 않습니다. (STRANK.io 표시 불가 -> STRANK 표시 가능)
 */
export function generateActivityDescription(
  activity: StravaActivity,
  rankingsWithDistrict: CalculateActivityRankingReturn | null,
  isEveryone: boolean
): string {
  const sections = [
    generateDateSection(activity.start_date),
    generateRankingSection(rankingsWithDistrict, isEveryone),
    generateAnalysisSection(activity),
  ]

  return sections.join('\n\n')
}

/**
 * 활동 날짜 섹션 생성 함수
 *
 * @param startDate - 활동 날짜
 * @returns 활동 날짜 섹션
 */
function generateDateSection(startDate: string): string {
  const date = new Date(startDate)
    .toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\. /g, '/')
    .replace('.', '')

  return `◎ 라이딩 리포트 ◎ 
(${date})`
}

/**
 * 랭킹 섹션 생성 함수
 *
 * @param rankingsWithDistrict - 랭킹 데이터
 * @param isEveryone - 공개 범위가 everyone인지 여부
 * @returns 랭킹 섹션
 */
function generateRankingSection(
  rankingsWithDistrict: CalculateActivityRankingReturn | null,
  isEveryone: boolean
): string {
  const { rankings, district } = rankingsWithDistrict || {}
  const section = '■ 랭킹 정보 ■'

  if (!isEveryone) {
    return `${section}\n\n공개 범위를 everyone으로 설정하지 않은 데이터는 랭킹 정보가 표기되지 않습니다.`
  }

  if (!rankings) return section

  const { distanceRankCity, distanceRankDistrict, elevationRankCity, elevationRankDistrict } =
    rankings
  const sections = []

  // 거리 랭킹 섹션
  sections.push('\n※ 거리 랭킹 ※')
  if (distanceRankCity && distanceRankDistrict) {
    sections.push(`📍 서울시 (${distanceRankCity.toLocaleString()}위)
📍 서울시 ${district} (${distanceRankDistrict.toLocaleString()}위)`)
  } else if (!distanceRankCity && !distanceRankDistrict) {
    sections.push(
      '이번주 내 거리기준으로 총합 1km를 넘지 않은 경우, 랭킹 정보가 표기되지 않습니다.'
    )
  }

  // 고도 랭킹 섹션
  sections.push('\n※ 고도 랭킹 ※')
  if (elevationRankCity && elevationRankDistrict) {
    sections.push(`📍 서울시 (${elevationRankCity.toLocaleString()}위)
📍 서울시 ${district} (${elevationRankDistrict.toLocaleString()}위)`)
  } else if (!elevationRankCity && !elevationRankDistrict) {
    sections.push('이번주 내 고도기준으로 총합 1m를 넘지 않은 경우, 랭킹 정보가 표기되지 않습니다.')
  }

  return sections.length ? `${section}\n${sections.join('\n')}` : section
}

/**
 * 분석 섹션 생성 함수
 *
 * @param activity - 분석할 활동 데이터
 * @returns 분석 섹션
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
    ['총거리', formatActivityValue(distance, 'distance'), ACTIVITY_UNITS.DISTANCE],
    ['총고도', formatActivityValue(total_elevation_gain), ACTIVITY_UNITS.ELEVATION],
    ['평균속도', formatActivityValue(average_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ['최고속도', formatActivityValue(max_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ['평균파워', formatActivityValue(average_watts), ACTIVITY_UNITS.POWER],
    ['최대파워', formatActivityValue(max_watts), ACTIVITY_UNITS.POWER],
    ['최고심박수', formatActivityValue(max_heartrate), ACTIVITY_UNITS.HEART_RATE],
    ['평균케이던스', formatActivityValue(average_cadence), ACTIVITY_UNITS.CADENCE],
  ]

  const analysisInfo = metrics
    .map(([label, value, unit]) => `${label} : ${value} ${unit}`)
    .join('\n')

  return `■ 라이딩 분석 정보 ■
${analysisInfo}
🔗 Powered by STRANK`
}

/**
 * 스트라바 활동의 설명을 업데이트하는 함수
 *
 * @description
 * 기존 설명이 있다면 유지하고 아래에 새로운 설명을 추가합니다
 *
 * @param accessToken - 스트라바 액세스 토큰
 * @param stravaActivity - 업데이트할 활동 정보
 * @param strankDescription - 스트랭크의 디스크립션
 *
 * @throws {Error} API_LIMIT_EXCEEDED - API 호출 한도 초과 시
 * @throws {Error} ACTIVITY_UPDATE_FAILED - 활동 업데이트 실패 시
 *
 * @remarks
 * - Rate limit 초과 시 별도의 에러를 발생시킵니다
 */
export async function updateStravaActivityDescription(
  accessToken: string,
  stravaActivity: StravaActivity,
  strankDescription: string
): Promise<void> {
  const combinedDescription = stravaActivity.description
    ? `${strankDescription}\n\n${stravaActivity.description}`
    : strankDescription

  const updateResponse = await fetch(
    `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: combinedDescription,
      }),
    }
  )

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()

    if (updateResponse.status === 429) {
      logError('Strava API: Rate limit exceeded when updating activity description', {
        functionName: 'updateStravaActivityDescription',
      })
      throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
    }

    logError('Strava API: Failed to update activity description:', {
      error: errorText,
      functionName: 'updateStravaActivityDescription',
    })
    throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
  }
}
