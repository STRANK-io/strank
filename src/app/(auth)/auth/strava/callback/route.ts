import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { redirectWithError } from '@/lib/utils/auth'
import { StravaTokenResponse } from '@/lib/types/strava'
import { REQUIRED_SCOPES, STRAVA_TOKEN_URL } from '@/lib/constants/strava'
import { logError } from '@/lib/utils/log'

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    // * 인가 코드
    const code = searchParams.get('code')

    if (!code) {
      logError('Authorization code not found', {
        endpoint: 'auth/strava/callback',
      })
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
      )
    }

    // * 서비스 이용에 필요한 권한이 모두 있는지 확인
    const grantedScopes = searchParams.get('scope')?.split(',') || []
    const missingScopes = REQUIRED_SCOPES.filter(scope => !grantedScopes.includes(scope))

    if (missingScopes.length > 0) {
      logError('Missing required Strava scopes', {
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
    const tokenResponse = await fetch(STRAVA_TOKEN_URL, {
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
      logError('Failed to exchange token with Strava', {
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
    const stravaTokenResponse: StravaTokenResponse = await tokenResponse.json()

    if (!stravaTokenResponse) {
      logError('Failed to get Strava token response', {
        error: stravaTokenResponse,
        endpoint: 'auth/strava/callback',
      })
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
      )
    }

    // * 유저 조회
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      logError('User not authenticated', {
        error: userError,
        endpoint: 'auth/strava/callback',
      })
      return redirectWithError(origin, ROUTES.PUBLIC.HOME, ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED)
    }

    const {
      athlete: { id: stravaAthleteId },
      access_token: stravaAccessToken,
      refresh_token: stravaRefreshToken,
      expires_at: stravaExpiresAt,
    } = stravaTokenResponse

    // *스트라바 토큰 저장
    const { error: tokenSaveError } = await supabase.from('strava_user_tokens').insert({
      user_id: user.id,
      strava_athlete_id: stravaAthleteId,
      access_token: stravaAccessToken,
      refresh_token: stravaRefreshToken,
      expires_at: new Date(stravaExpiresAt * 1000).toISOString(),
    })

    if (tokenSaveError) {
      // * 동일한 stravaAthleteId를 가진 계정 데이터가 strava_user_tokens 테이블에 있는 경우 -> 이미 연동된 계정이므로 가입 불가
      if (tokenSaveError.code === '23505') {
        return redirectWithError(
          origin,
          ROUTES.PUBLIC.STRAVA_CONNECT,
          ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED_ALREADY_CONNECTED
        )
      }

      logError('Failed to save token to database', {
        error: tokenSaveError,
        endpoint: 'auth/strava/callback',
      })
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
      )
    }

    // 성공 시 strava-sync 페이지로 이동
    return NextResponse.redirect(`${origin}${ROUTES.PUBLIC.STRAVA_SYNC}`)
  } catch (error) {
    logError('Strava callback error:', {
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
