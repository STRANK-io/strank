import { Database } from '@/lib/supabase/supabase'
import { logError } from '@/lib/utils/log'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * 토큰이 만료되었거나 만료가 임박한지 확인하는 함수
 * @param expiresAt 토큰 만료 시간 (ISO 문자열 또는 timestamp)
 * @param thresholdHours 만료 임박 판단 기준 시간(시간 단위, 기본값: 1시간)
 * @returns true: 토큰 갱신 필요, false: 토큰이 아직 유효함
 */
export function isTokenExpiringSoon(
  expiresAt: string | number,
  thresholdHours: number = 1
): boolean {
  const expirationTime = new Date(expiresAt).getTime()
  const currentTime = Date.now()
  const thresholdMs = thresholdHours * 3600 * 1000

  return expirationTime - currentTime <= thresholdMs
}

/**
 * Strava 리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급받고,
 * 데이터베이스에 해당 사용자의 토큰 정보를 업데이트하는 함수
 *
 * @param supabase - 데이터베이스 작업을 위한 Supabase 클라이언트 인스턴스
 * @param userId - Strava 토큰 정보를 업데이트할 사용자의 ID
 * @param refreshToken - 새로운 액세스 토큰 발급에 사용할 리프레시 토큰
 * @returns 새로운 액세스 토큰
 *
 * @remarks
 * 이 함수는 Strava API와 상호작용하며, 서버단에서 실행되어야 합니다.
 * 또한 아래 환경 변수가 필요합니다:
 * - `NEXT_PUBLIC_STRAVA_CLIENT_ID`
 * - `STRAVA_CLIENT_SECRET`
 */
export async function refreshStravaTokenAndUpdate(
  supabase: SupabaseClient<Database>,
  userId: string,
  refreshToken: string
) {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const { error } = await response.json()
    logError('Strava Token Refresh Error: [refreshStravaTokenAndUpdate]', {
      error,
    })
    throw new Error(error)
  }

  const data = await response.json()

  // 새로운 토큰으로 업데이트
  const { error: updateError } = await supabase
    .from('strava_user_tokens')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(data.expires_at * 1000).toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) {
    logError('Strava Token Update Error: 데이터베이스 업데이트 실패', {
      error: updateError,
    })
  }

  return data.access_token
}
