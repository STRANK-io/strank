import { createClient } from '@/lib/supabase/server'
import { STRAVA_OAUTH_BASE_URL, STRAVA_TOKEN_ENDPOINT } from '@/lib/constants/strava'
import { logError } from '@/lib/utils/log'

/**
 * Strava 액세스 토큰이 만료되었는지 확인하고 필요한 경우 갱신하는 함수
 *
 * @param userId - 사용자 ID
 * @returns 갱신 필요 여부와 새 액세스 토큰 (갱신된 경우)
 */
export async function refreshStravaToken(userId: string) {
  const supabase = await createClient()

  // 토큰 정보 가져오기
  const { data: tokenData, error: tokenError } = await supabase
    .from('strava_user_tokens')
    .select('refresh_token, expires_at, access_token')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()

  if (tokenError || !tokenData) {
    throw new Error('Token not found')
  }

  // 토큰이 만료되었는지 확인
  const now = new Date()
  const expiresAt = new Date(tokenData.expires_at)

  // 만료 10분 전부터 갱신 시도 (여유 시간 확보)
  if (expiresAt.getTime() - now.getTime() > 10 * 60 * 1000) {
    return {
      needsRefresh: false,
      accessToken: tokenData.access_token,
    }
  }

  try {
    // 토큰 갱신 요청
    const response = await fetch(`${STRAVA_OAUTH_BASE_URL}${STRAVA_TOKEN_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      logError('Failed to refresh token:', {
        response,
        functionName: 'refreshStravaToken',
      })
      throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`)
    }

    const refreshData = await response.json()

    // 새 토큰 정보 저장
    const { error: updateError } = await supabase
      .from('strava_user_tokens')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: new Date(refreshData.expires_at * 1000).toISOString(),
      })
      .eq('user_id', userId)
      .is('deleted_at', null)

    if (updateError) {
      throw new Error(`Failed to update token: ${updateError.message}`)
    }

    logError('Token refreshed successfully', {
      userId,
      expiresAt: new Date(refreshData.expires_at * 1000).toISOString(),
    })

    return {
      needsRefresh: true,
      accessToken: refreshData.access_token,
    }
  } catch (error) {
    logError('Token refresh error:', { error, userId })
    throw error
  }
}
