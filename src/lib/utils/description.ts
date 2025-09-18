import { StravaActivity } from '@/lib/types/strava'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'

/**
 * 스트라바 활동의 설명을 업데이트하는 함수
 *
 * @description
 * - STRANK 디스크립션을 최상단에 배치
 * - 기존 유저 설명이 있으면 합치되, Strava 기본 플레이스홀더("Morning/Evening/Afternoon Ride")는 제외
 * - Rate Limit/실패 시 에러 처리
 */
export async function updateStravaActivityDescription(
  accessToken: string,
  stravaActivity: StravaActivity,
  strankDescription: string
): Promise<void> {
  // 안전을 위해 DB 반영 대기 (업로드 직후 API 호출 충돌 방지)
  await new Promise(resolve => setTimeout(resolve, 4000))

  console.log('🔄 디스크립션 업데이트 직전 최신 활동 데이터 조회 중...')

  const latestActivityResponse = await fetch(
    `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

  // 📝 기존 디스크립션 분석
  const existingDescription = latestActivity.description?.trim() || ''
  const defaultPlaceholders = ['Morning Ride', 'Afternoon Ride', 'Evening Ride']

  let filteredDescription = ''
  if (existingDescription && !defaultPlaceholders.includes(existingDescription)) {
    filteredDescription = existingDescription
  }

  // 📝 최종 결합
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
