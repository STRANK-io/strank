import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/log'
import { ERROR_CODES } from '@/lib/constants/error'

// 진행 중인 중단 요청을 추적하기 위한 메모리 맵
// 주의: 이 방식은 서버리스 환경에서는 인스턴스 간에 공유되지 않음
const abortInProgress = new Map<string, number>()

// 만료된 항목 정리 (5분 이상 지난 항목)
const cleanupExpiredAborts = () => {
  const now = Date.now()
  // Array.from을 사용하여 Map 항목을 배열로 변환하여 반복
  Array.from(abortInProgress.entries()).forEach(([userId, timestamp]) => {
    if (now - timestamp > 5 * 60 * 1000) {
      abortInProgress.delete(userId)
    }
  })
}

/**
 * Strava 동기화 중단 API 엔드포인트
 *
 * 사용자가 동기화 페이지를 이탈하거나 동기화를 중단할 때 호출됩니다.
 * 토큰 정보를 삭제하고 strava_connected_at을 초기화합니다.
 */
export async function POST() {
  try {
    const supabase = await createClient()

    // 사용자 인증 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED }, { status: 401 })
    }

    const userId = user.id
    let hasErrors = false

    // 만료된 항목 정리
    cleanupExpiredAborts()

    // 이미 처리 중인지 확인 (동시 요청 방지)
    if (abortInProgress.has(userId)) {
      return NextResponse.json({
        success: true,
        message: 'Cleanup already in progress',
      })
    }

    // 처리 중 표시
    abortInProgress.set(userId, Date.now())

    // 트랜잭션 처리를 위한 함수
    const cleanupUserData = async () => {
      // 1. 토큰 정보 삭제 (hard delete)
      try {
        const { error: tokenDeleteError } = await supabase
          .from('strava_user_tokens')
          .delete()
          .eq('user_id', userId)

        if (tokenDeleteError) {
          logError('Failed to delete token on abort:', {
            error: tokenDeleteError,
            userId,
            endpoint: 'api/strava/sync/abort',
          })
          hasErrors = true
        }
      } catch (error) {
        logError('Error deleting token on abort:', {
          error,
          userId,
          endpoint: 'api/strava/sync/abort',
        })
        hasErrors = true
      }

      // 2. strava_connected_at 초기화
      try {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            strava_connected_at: null,
          })
          .eq('id', userId)

        if (userUpdateError) {
          logError('Failed to update user on abort:', {
            error: userUpdateError,
            userId,
            endpoint: 'api/strava/sync/abort',
          })
          hasErrors = true
        }
      } catch (error) {
        logError('Error updating user on abort:', {
          error,
          userId,
          endpoint: 'api/strava/sync/abort',
        })
        hasErrors = true
      }

      // 3. 최근 활동 데이터 삭제 (30분 이내 생성된 데이터)
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

        const { error: activitiesDeleteError } = await supabase
          .from('activities')
          .delete()
          .eq('user_id', userId)
          .gte('created_at', thirtyMinutesAgo)

        if (activitiesDeleteError) {
          logError('Failed to delete recent activities on abort:', {
            error: activitiesDeleteError,
            userId,
            endpoint: 'api/strava/sync/abort',
          })
          hasErrors = true
        }
      } catch (error) {
        logError('Error deleting recent activities on abort:', {
          error,
          userId,
          endpoint: 'api/strava/sync/abort',
        })
        hasErrors = true
      }
    }

    // 최대 3번 재시도
    for (let attempt = 0; attempt < 3; attempt++) {
      hasErrors = false
      await cleanupUserData()

      if (!hasErrors) {
        break
      }

      // 오류 발생 시 잠시 대기 후 재시도
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }

    // 처리 완료 표시
    abortInProgress.delete(userId)

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? 'Cleanup completed with some errors' : 'Cleanup completed successfully',
    })
  } catch (error) {
    logError('Unexpected error in abort handler:', {
      error,
      endpoint: 'api/strava/sync/abort',
    })

    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 })
  }
}
