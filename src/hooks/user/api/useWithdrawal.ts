import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUserContext } from '@/contexts/UserContext'
import { logError } from '@/lib/utils/log'
import {
  STRAVA_OAUTH_BASE_URL,
  STRAVA_OAUTH_DEAUTHORIZE_ENDPOINT,
  STRAVA_TOKEN_ENDPOINT,
} from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'

/**
 * 스트라바 토큰 정보 타입
 */
interface StravaTokenInfo {
  access_token: string
  refresh_token: string
  expires_at: number | string
}

/**
 * 스트라바 토큰을 갱신하는 함수
 *
 * @param refreshToken - 리프레시 토큰
 * @returns 갱신된 액세스 토큰
 */
async function refreshStravaToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${STRAVA_OAUTH_BASE_URL}${STRAVA_TOKEN_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    logError('Strava Token Refresh Error: [refreshStravaToken]', {
      response,
      functionName: 'useWithdrawal',
    })
    throw new Error('Failed to refresh Strava token')
  }

  const data = await response.json()
  return data.access_token
}

/**
 * 스트라바 연동을 해제하는 함수
 *
 * @param accessToken - 액세스 토큰
 * @returns 연동 해제 성공 여부
 */
async function deauthorizeStrava(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${STRAVA_OAUTH_BASE_URL}${STRAVA_OAUTH_DEAUTHORIZE_ENDPOINT}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    return response.ok
  } catch (error) {
    logError('Failed to deauthorize Strava', { error })
    return false
  }
}

/**
 * 스트라바 연동 해제 처리를 수행하는 함수
 *
 * @param tokenInfo - 스트라바 토큰 정보
 */
async function handleStravaDeauthorization(tokenInfo: StravaTokenInfo): Promise<void> {
  try {
    let accessToken = tokenInfo.access_token

    // 토큰 만료 확인 및 갱신
    const expiresAtTimestamp = Number(tokenInfo.expires_at)
    const expiresAt = new Date(expiresAtTimestamp * 1000)
    const now = new Date()

    if (!isNaN(expiresAtTimestamp) && expiresAt <= now && tokenInfo.refresh_token) {
      // 토큰 갱신
      accessToken = await refreshStravaToken(tokenInfo.refresh_token)
    }

    // 스트라바 연동 해제
    await deauthorizeStrava(accessToken)
  } catch (error) {
    logError('Failed to deauthorize Strava', { error })
    // 스트라바 연동 해제 실패는 전체 프로세스를 실패로 처리하지 않음
  }
}

/**
 * 사용자 탈퇴 처리를 위한 훅
 */
const useWithdrawal = () => {
  const supabase = createClient()
  const { userId } = useUserContext()

  return useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error(ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED)
      }

      // * 유저 회원탈퇴 처리
      const { data, error } = await supabase.rpc('withdraw_user')

      if (error) {
        logError('Failed to withdraw user', { error })
        if (error.message === 'authentication_required') {
          throw new Error(ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED)
        }
        throw new Error(ERROR_CODES.AUTH.WITHDRAWAL_FAILED)
      }

      if (!data) {
        logError('Unexpected response from withdraw_user', { data })
        throw new Error(ERROR_CODES.AUTH.WITHDRAWAL_FAILED)
      }

      // 토큰 정보 변환 (unknown으로 먼저 변환하여 타입 경고 해결)
      const tokenInfo = data as unknown as StravaTokenInfo | null

      // * 스트라바 연동 해제 처리
      if (tokenInfo?.access_token) {
        await handleStravaDeauthorization(tokenInfo)
      }

      // 로그아웃
      await supabase.auth.signOut()

      return { success: true }
    },
  })
}

export default useWithdrawal
