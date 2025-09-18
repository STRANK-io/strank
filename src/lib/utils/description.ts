import { StravaActivity } from '@/lib/types/strava'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { CalculateActivityRankingReturn } from '@/lib/types/ranking'

/**
 * 랭킹 섹션 생성 함수
 */
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
      }${rankings.distanceRankDistrict ? `\n📍${district} (${rankings.distanceRankDistrict}위)` : ''}`
    )
  }

  if (rankings.elevationRankCity || rankings.elevationRankDistrict) {
    sections.push(
      `🧗 고도 랭킹${
        rankings.elevationRankCity ? `\n📍${province} (${rankings.elevationRankCity}위)` : ''
      }${
        rankings.elevationRankDistrict
          ? `\n📍${district} (${rankings.elevationRankDistrict}위)`
          : ''
      }`
    )
  }

  return sections.join('\n\n')
}

/**
 * GPT 기반 디스크립션 래퍼
 * (실제 생성은 openai.ts 의 generateActivityDescriptionWithGPT 가 담당)
 */
export async function generateActivityDescription(
  activity: StravaActivity,
  rankingsWithDistrict: CalculateActivityRankingReturn | null,
  accessToken: string
): Promise<string> {
  const { generateActivityDescriptionWithGPT } = await import('@/lib/utils/openai')

  return generateActivityDescriptionWithGPT(
    {
      date: activity.start_date_local,
      distance: (activity.distance || 0) / 1000,
      elevation: activity.total_elevation_gain || 0,
      averageSpeed: (activity.average_speed || 0) * 3.6,
      maxSpeed: (activity.max_speed || 0) * 3.6,
      averageWatts: activity.average_watts || undefined,
      maxWatts: activity.max_watts || undefined,
      maxHeartrate: activity.max_heartrate || undefined,
      averageCadence: activity.average_cadence || undefined,
    },
    rankingsWithDistrict?.rankings
      ? {
          distanceRankCity: rankingsWithDistrict.rankings?.distanceRankCity ?? null,
          distanceRankDistrict: rankingsWithDistrict.rankings?.distanceRankDistrict ?? null,
          elevationRankCity: rankingsWithDistrict.rankings?.elevationRankCity ?? null,
          elevationRankDistrict: rankingsWithDistrict.rankings?.elevationRankDistrict ?? null,
          district: rankingsWithDistrict.district,
          province: rankingsWithDistrict.province,
        }
      : undefined
  )
}

/**
 * 스트라바 활동의 설명을 업데이트하는 함수
 */
export async function updateStravaActivityDescription(
  accessToken: string,
  stravaActivity: StravaActivity,
  strankDescription: string
): Promise<void> {
  // 업로드 직후 충돌 방지용 대기
  await new Promise(resolve => setTimeout(resolve, 4000))

  console.log('🔄 디스크립션 업데이트 직전 최신 활동 데이터 조회 중...')

  const latestActivityResponse = await fetch(
    `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!latestActivityResponse.ok) {
    const errorText = await latestActivityResponse.text()
    logError('최신 활동 데이터 조회 실패:', {
      status: latestActivityResponse.status,
      error: errorText,
      functionName: 'updateStravaActivityDescription',
    })
    throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
  }

  const latestActivity: StravaActivity = await latestActivityResponse.json()

  // 기존 디스크립션 확인
  const existingDescription = latestActivity.description?.trim() || ''
  const defaultPlaceholders = ['Morning Ride', 'Afternoon Ride', 'Evening Ride']

  let filteredDescription = ''
  if (existingDescription && !defaultPlaceholders.includes(existingDescription)) {
    filteredDescription = existingDescription
  }

  // 최종 결합 (STRANK 위 + 기존/서드파티 아래)
  const combinedDescription = filteredDescription
    ? `${strankDescription}\n\n${filteredDescription}`
    : strankDescription

  console.log('📤 최종 디스크립션 업데이트:', {
    activityId: stravaActivity.id,
    finalDescriptionLength: combinedDescription.length,
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

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()

    if (updateResponse.status === 429) {
      logError('Strava API: Rate limit exceeded when updating activity description', {
        functionName: 'updateStravaActivityDescription',
      })
      throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
    }

    logError('Strava API: Failed to update activity description', {
      status: updateResponse.status,
      error: errorText,
      functionName: 'updateStravaActivityDescription',
    })
    throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
  }

  const result = await updateResponse.json()
  console.log('✅ 최종 업데이트된 디스크립션:', result.description)
}
