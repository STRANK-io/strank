import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { redirectWithError } from '@/lib/utils/auth'
import { StravaTokenResponse } from '@/lib/types/strava'
import { STRAVA_TOKEN_URL } from '@/lib/constants/strava'

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      // 연동 페이지로 리다이렉트 -> 다시 계정 연동하게 만들기
      console.error('Strava callback: Authorization code not found')
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
      )
    }

    // Strava API 토큰 교환
    const tokenResponse = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      // 연동 페이지로 리다이렉트 -> 다시 계정 연동하게 만들기
      console.error('Strava callback: Failed to exchange token with Strava')
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
      )
    }

    const stravaData: StravaTokenResponse = await tokenResponse.json()
    // Supabase 클라이언트 초기화
    const supabase = await createClient()

    // 현재 로그인한 유저 정보 가져오기
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Strava callback: User not authenticated')
      return redirectWithError(origin, ROUTES.PUBLIC.HOME, ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED)
    }

    // strava_user_tokens 테이블에 토큰 저장/업데이트
    const { error: tokenError } = await supabase.from('strava_user_tokens').upsert(
      {
        user_id: user.id,
        strava_athlete_id: stravaData.athlete.id,
        access_token: stravaData.access_token,
        refresh_token: stravaData.refresh_token,
        expires_at: new Date(stravaData.expires_at * 1000).toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )

    if (tokenError) {
      console.error('Strava callback: Failed to save token to database')
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
      )
    }

    // 성공 시 strava-sync 페이지로 리다이렉트
    return NextResponse.redirect(`${origin}${ROUTES.PUBLIC.STRAVA_SYNC}`)
  } catch (error) {
    console.error('Strava callback error:', error)
    return redirectWithError(
      origin,
      ROUTES.PUBLIC.STRAVA_CONNECT,
      ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
    )
  }
}
