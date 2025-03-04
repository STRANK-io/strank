import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES, type ErrorMessageCode } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { fetchStravaActivities, processActivities } from '@/lib/utils/strava'
import { refreshStravaToken } from '@/lib/utils/stravaToken'

export async function POST(request: Request) {
  try {
    const { userId } = (await request.json()) as { userId: string }

    const supabase = await createClient()

    // 토큰 갱신 및 액세스 토큰 가져오기
    let accessToken
    try {
      const tokenResult = await refreshStravaToken(userId)
      accessToken = tokenResult.accessToken
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

    try {
      // 스트라바 활동 데이터 조회 (재시도 로직 적용)
      const abortController = new AbortController()
      const activities = await fetchStravaActivities(
        accessToken,
        1,
        supabase,
        abortController.signal
      )

      if (activities.length === 0) {
        return NextResponse.json({ message: 'No new activities' })
      }

      // 활동 데이터 저장
      await processActivities(activities, userId, supabase)

      return NextResponse.json({ message: 'Activities synced successfully' })
    } catch (error) {
      // 오류 유형에 따른 처리
      let errorCode: ErrorMessageCode = ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED
      let statusCode = 500

      if (error instanceof Error) {
        if (error.message === ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED) {
          errorCode = ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED
          statusCode = 429
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorCode = ERROR_CODES.NETWORK.CONNECTION_LOST
        }
      }

      logError('Failed to sync activities:', {
        endpoint: '/api/strava/activities/sync',
        error,
        errorCode,
      })

      return NextResponse.json({ error: errorCode }, { status: statusCode })
    }
  } catch (error) {
    logError('Failed to process request:', {
      endpoint: '/api/strava/activities/sync',
      error,
    })
    return NextResponse.json({ error: ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED }, { status: 500 })
  }
}
