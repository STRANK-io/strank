import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { StravaActivity } from '@/lib/types/strava'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'

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
총거리 : ${formatActivityValue(distance)}${ACTIVITY_UNITS.distance}
총고도 : ${formatActivityValue(total_elevation_gain)}${ACTIVITY_UNITS.elevation}
평균속도 : ${formatActivityValue(average_speed)}${ACTIVITY_UNITS.speed}
최고속도 : ${formatActivityValue(max_speed)}${ACTIVITY_UNITS.speed}
평균파워 : ${formatActivityValue(average_watts)}${ACTIVITY_UNITS.power}
최대파워 : ${formatActivityValue(max_watts)}${ACTIVITY_UNITS.power}
최고심박수 : ${formatActivityValue(max_heartrate)}${ACTIVITY_UNITS.heart_rate}
평균케이던스 : ${formatActivityValue(average_cadence)}${ACTIVITY_UNITS.cadence}
🔗 Powered by STRANK
`

  return description
}
