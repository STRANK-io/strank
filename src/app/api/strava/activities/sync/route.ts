import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { fetchStravaActivities, processActivities } from '@/lib/utils/strava'
import { isTokenExpiringSoon, refreshStravaTokenAndUpdate } from '@/lib/utils/stravaToken'

export async function POST(request: Request) {
  try {
    const { userId } = (await request.json()) as { userId: string }

    const supabase = await createClient()

    // 1. 스트라바 토큰 조회
    const { data: tokenData, error: tokenError } = await supabase
      .from('strava_user_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokenData) {
      logError('Failed to get strava token data:', {
        endpoint: '/api/strava/activities/sync',
        error: tokenError,
      })
      return NextResponse.json(
        { error: ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED },
        { status: 401 }
      )
    }

    const { access_token, refresh_token, expires_at } = tokenData

    // 2. 토큰 만료 확인 및 갱신
    let accessToken = access_token

    if (isTokenExpiringSoon(expires_at)) {
      try {
        accessToken = await refreshStravaTokenAndUpdate(supabase, userId, refresh_token)
      } catch (error) {
        logError('Failed to refresh token:', {
          endpoint: '/api/strava/activities/sync',
          error,
        })
        return NextResponse.json(
          { error: ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED },
          { status: 401 }
        )
      }
    }

    try {
      // 3. 스트라바 활동 데이터 조회
      const activities = await fetchStravaActivities(accessToken, 1, supabase)

      if (activities.length === 0) {
        return NextResponse.json({ message: 'No new activities' })
      }

      // 4. 활동 데이터 저장
      await processActivities(activities, userId, supabase)

      return NextResponse.json({ message: 'Activities synced successfully' })
    } catch (error) {
      logError('Failed to sync activities:', {
        endpoint: '/api/strava/activities/sync',
        error,
      })
      return NextResponse.json(
        { error: ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED },
        { status: 500 }
      )
    }
  } catch (error) {
    logError('Failed to process request:', {
      endpoint: '/api/strava/activities/sync',
      error,
    })
    return NextResponse.json({ error: ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED }, { status: 500 })
  }
}
