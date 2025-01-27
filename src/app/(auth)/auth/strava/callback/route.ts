import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { redirectWithError } from '@/lib/utils/auth'
import { StravaTokenResponse } from '@/lib/types/strava'
import { STRAVA_TOKEN_URL } from '@/lib/constants/strava'
import { logError } from '@/lib/utils/log'

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
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

    const {
      athlete: { id: stravaAthleteId },
      access_token: stravaAccessToken,
      refresh_token: stravaRefreshToken,
      expires_at: stravaExpiresAt,
    }: StravaTokenResponse = await tokenResponse.json()
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

    // 이미 연동된 스트라바 계정인지 조회
    const { data: tokenData } = await supabase
      .from('strava_user_tokens')
      .select('*')
      .eq('strava_athlete_id', stravaAthleteId)
      .is('deleted_at', null)

    if (tokenData && tokenData[0]) {
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED_ALREADY_CONNECTED
      )
    }

    // 스트라바 토큰 저장
    const { error: tokenError } = await supabase.from('strava_user_tokens').upsert(
      {
        user_id: user.id,
        strava_athlete_id: stravaAthleteId,
        access_token: stravaAccessToken,
        refresh_token: stravaRefreshToken,
        expires_at: new Date(stravaExpiresAt * 1000).toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )

    if (tokenError) {
      logError('Failed to save token to database', {
        error: tokenError,
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
