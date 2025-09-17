export async function updateStravaActivityDescription(
  accessToken: string,
  stravaActivity: StravaActivity,
  strankDescription: string
): Promise<void> {
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
    logError('최신 활동 데이터 조회 실패', {
      error: {
        status: latestActivityResponse.status,
        statusText: latestActivityResponse.statusText,
        body: errorText,
      },
      functionName: 'updateStravaActivityDescription',
      activityId: stravaActivity.id,
    })
    throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
  }

  const latestActivity: StravaActivity = await latestActivityResponse.json()

  // 기존 디스크립션 결합
  let combinedDescription: string
  if (latestActivity.description && latestActivity.description.trim().length > 0) {
    combinedDescription = `${strankDescription}\n\n${latestActivity.description}`
  } else {
    combinedDescription = strankDescription
  }

  // ✅ Strava는 description 2000자 제한
  if (combinedDescription.length > 2000) {
    console.log(`⚠️ 디스크립션이 2000자 초과 (${combinedDescription.length}), 잘라냅니다.`)
    combinedDescription = combinedDescription.slice(0, 1999)
  }

  console.log('📤 최종 디스크립션 업데이트', {
    activityId: stravaActivity.id,
    finalLength: combinedDescription.length,
    preview: combinedDescription.substring(0, 200) + '...',
  })

  // Strava API PATCH 요청
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
    logError('Strava API: Failed to update activity description', {
      error: {
        status: updateResponse.status,
        statusText: updateResponse.statusText,
        body: errorText,
      },
      activityId: stravaActivity.id,
      descriptionLength: combinedDescription.length,
      functionName: 'updateStravaActivityDescription',
    })

    if (updateResponse.status === 429) {
      throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
    }
    if (updateResponse.status === 401) {
      throw new Error('Unauthorized: Access token may be expired or invalid')
    }
    if (updateResponse.status === 400) {
      throw new Error('Bad Request: Description may be invalid or too long')
    }

    throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
  }

  console.log('✅ 디스크립션 업데이트 성공:', {
    activityId: stravaActivity.id,
    status: updateResponse.status,
  })
}
