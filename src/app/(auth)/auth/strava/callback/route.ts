import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { redirectWithError } from '@/lib/utils/auth'
import { StravaTokenResponse } from '@/lib/types/strava'
import {
  REQUIRED_SCOPES,
  STRAVA_OAUTH_BASE_URL,
  STRAVA_TOKEN_ENDPOINT,
} from '@/lib/constants/strava'
import { logError } from '@/lib/utils/log'

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      logError('스트라바 인가 코드 누락', {
        endpoint: 'auth/strava/callback',
      })
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
      )
    }

    // ✅ redirect URL에서 받은 scope
    const scopeFromQuery = searchParams.get('scope') || ''

    // * 서비스 이용에 필요한 권한 확인
    const grantedScopes = scopeFromQuery.split(',').filter(Boolean)
    const missingScopes = REQUIRED_SCOPES.filter(scope => !grantedScopes.includes(scope))

    if (missingScopes.length > 0) {
      logError('스트라바 필요 권한 누락', {
        grantedScopes,
        missingScopes,
        endpoint: 'auth/strava/callback',
      })
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.STRAVA.INSUFFICIENT_PERMISSIONS
      )
    }

    // * 토큰 요청
    const tokenResponse = await fetch(`${STRAVA_OAUTH_BASE_URL}${STRAVA_TOKEN_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      logError('스트라바 토큰 교환 실패', {
        error: tokenResponse,
        endpoint: 'auth/strava/callback',
      })
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
      )
    }

    // * 토큰 응답
    const stravaTokenResponse: StravaTokenResponse & { scope?: string } =
      await tokenResponse.json()

    const {
      athlete: { id: stravaAthleteId },
      access_token: stravaAccessToken,
      refresh_token: stravaRefreshToken,
      expires_at: stravaExpiresAt,
      scope: scopeFromResponse,
    } = stravaTokenResponse

    // ✅ scope 최종 결정 (토큰 응답 > 쿼리 > null)
    const scope = scopeFromResponse || scopeFromQuery || null

    // * 토큰 저장 및 연동 완료 처리 (트랜잭션)
    const supabase = await createClient()

    const { data: result, error: rpcError } = await supabase.rpc(
      'save_strava_token_and_update_user',
      {
        p_strava_athlete_id: stravaAthleteId,
        p_access_token: stravaAccessToken,
        p_refresh_token: stravaRefreshToken,
        p_expires_at: new Date(stravaExpiresAt * 1000).toISOString(),
        p_scope: scope, // ✅ scope 저장
      }
    )

    if (rpcError) {
      logError('RPC error (save_strava_token_and_update_user):', {
        error: rpcError,
        endpoint: 'auth/strava/callback',
      })
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
      )
    }

    // 결과에 따른 처리
    switch (result) {
      case 'SUCCESS':
        return NextResponse.redirect(`${origin}${ROUTES.PUBLIC.STRAVA_SYNC}`)

      case 'ALREADY_CONNECTED':
        return redirectWithError(
          origin,
          ROUTES.PUBLIC.STRAVA_CONNECT,
          ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED_ALREADY_CONNECTED
        )

      case 'AUTH_REQUIRED':
        return redirectWithError(
          origin,
          ROUTES.PUBLIC.HOME,
          ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED
        )

      case 'DB_ERROR':
      default:
        logError('스트라바 토큰 저장 및 연동 완료 처리 실패', {
          result,
          endpoint: 'auth/strava/callback',
        })
        return redirectWithError(
          origin,
          ROUTES.PUBLIC.STRAVA_CONNECT,
          ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
        )
    }
  } catch (error) {
    logError('스트라바 콜백 오류', {
      error,
      endpoint: 'auth/strava/callback',
    })
    return redirectWithError(
      origin,
      ROUTES.PUBLIC.STRAVA_CONNECT,
      ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
    )
  }
}
