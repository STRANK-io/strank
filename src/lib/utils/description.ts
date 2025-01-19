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
  rankingsWithDistrict: CalculateActivityRankingReturn | null
): string {
  const { rankings, district } = rankingsWithDistrict || {}
  const {
    start_date,
    distance = 0,
    total_elevation_gain = 0,
    average_speed = 0,
    max_speed = 0,
    average_watts = 0,
    max_watts = 0,
    max_heartrate = 0,
    average_cadence = 0,
  } = activity

  const date = new Date(start_date)
    .toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\. /g, '/')
    .replace('.', '')

  // 기본 정보 섹션
  let description = `◎ 라이딩 리포트 ◎
(${date})`

  // rankings가 있고, null이 아닌 경우에만 랭킹 정보 섹션 추가
  if (rankings) {
    const { distanceRankCity, distanceRankDistrict, elevationRankCity, elevationRankDistrict } =
      rankings

    description += '\n\n■ 랭킹 정보 ■'

    // 거리 랭킹이 있는 경우
    if (distanceRankCity && distanceRankDistrict) {
      description += `
※ 거리 랭킹 ※
📍 서울시 (${distanceRankCity.toLocaleString()}위)
📍 서울시 ${district} (${distanceRankDistrict.toLocaleString()}위)`
    }

    // 고도 랭킹이 있는 경우
    if (elevationRankCity && elevationRankDistrict) {
      description += `
※ 고도 랭킹 ※
📍 서울시 (${elevationRankCity.toLocaleString()}위)
📍 서울시 ${district} (${elevationRankDistrict.toLocaleString()}위)`
    }
  }

  // 분석 정보 섹션
  description += `
\n■ 라이딩 분석 정보 ■
총거리 : ${formatActivityValue(distance, 'distance')} ${ACTIVITY_UNITS.DISTANCE}
총고도 : ${formatActivityValue(total_elevation_gain)} ${ACTIVITY_UNITS.ELEVATION}
평균속도 : ${formatActivityValue(average_speed, 'speed')} ${ACTIVITY_UNITS.SPEED}
최고속도 : ${formatActivityValue(max_speed, 'speed')} ${ACTIVITY_UNITS.SPEED}
평균파워 : ${formatActivityValue(average_watts)} ${ACTIVITY_UNITS.POWER}
최대파워 : ${formatActivityValue(max_watts)} ${ACTIVITY_UNITS.POWER}
최고심박수 : ${formatActivityValue(max_heartrate)} ${ACTIVITY_UNITS.HEART_RATE}
평균케이던스 : ${formatActivityValue(average_cadence)} ${ACTIVITY_UNITS.CADENCE}
🔗 Powered by STRANK
`

  return description
}

/**
 * 스트라바 활동의 설명을 업데이트하는 함수
 *
 * @description
 * 기존 설명이 있다면 유지하고 아래에 새로운 설명을 추가합니다
 *
 * @param accessToken - 스트라바 액세스 토큰
 * @param activity - 업데이트할 활동 정보
 * @param newDescription - 추가할 새로운 설명
 *
 * @throws {Error} API_LIMIT_EXCEEDED - API 호출 한도 초과 시
 * @throws {Error} ACTIVITY_UPDATE_FAILED - 활동 업데이트 실패 시
 *
 * @remarks
 * - Rate limit 초과 시 별도의 에러를 발생시킵니다
 */
export async function updateStravaActivityDescription(
  accessToken: string,
  activity: StravaActivity,
  newDescription: string
): Promise<void> {
  const combinedDescription = activity.description
    ? `${activity.description}\n\n${newDescription}`
    : newDescription

  const updateResponse = await fetch(
    `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(activity.id)}`,
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
