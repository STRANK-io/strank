import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES, type ErrorMessageCode } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { fetchStravaActivities, processActivities } from '@/lib/utils/strava'
import { refreshStravaToken } from '@/lib/utils/stravaToken'
import { generateActivityHash } from '@/lib/utils/activity'

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

      // 각 활동에 대해 해시값 생성
      const activitiesWithHash = activities.map(activity => ({
        ...activity,
        activity_hash: generateActivityHash(
          userId,
          activity.distance || 0,
          activity.total_elevation_gain || 0,
          activity.start_date
        ),
      }))

      // 해시값 기준으로 그룹화하고 각 그룹에서 가장 최신 활동만 선택
      const uniqueActivities = Object.values(
        activitiesWithHash.reduce(
          (acc, activity) => {
            if (!acc[activity.activity_hash] || activity.id > acc[activity.activity_hash].id) {
              acc[activity.activity_hash] = activity
            }
            return acc
          },
          {} as Record<string, (typeof activitiesWithHash)[0]>
        )
      )

      // DB에서 해시값이 일치하는 기존 활동들 조회
      const { data: existingActivities } = await supabase
        .from('activities')
        .select('id, activity_hash')
        .in(
          'activity_hash',
          uniqueActivities.map(a => a.activity_hash)
        )
        .is('deleted_at', null)

      if (existingActivities) {
        // 해시값이 같은데 ID가 다른 스트랭크 내 활동들 삭제
        const activitiesToDelete = existingActivities.filter(existing =>
          uniqueActivities.some(
            activity =>
              activity.activity_hash === existing.activity_hash && activity.id !== existing.id
          )
        )

        if (activitiesToDelete.length > 0) {
          await supabase
            .from('activities')
            .delete()
            .in(
              'id',
              activitiesToDelete.map(a => a.id)
            )
        }
      }

      // 중복되지 않은 활동 저장 (이제 upsert가 가능한 상태)
      await processActivities(uniqueActivities, userId, supabase)

      return NextResponse.json({
        message: 'Activities synced successfully',
        total: activities.length,
        unique: uniqueActivities.length,
        duplicates: activities.length - uniqueActivities.length,
      })
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
