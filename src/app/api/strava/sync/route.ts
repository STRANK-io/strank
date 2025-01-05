import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES } from '@/lib/constants/error'
import { User } from '@supabase/supabase-js'
import { SYNC_CONFIG } from '@/lib/constants/strava'
import { calculateProgress, fetchStravaActivities, processActivities } from '@/lib/utils/strava'
import { StravaActivity } from '@/lib/types/strava'

export async function GET() {
  const supabase = await createClient()
  const encoder = new TextEncoder()

  let currentUser: User | null = null
  let isControllerClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (progress: number, status: string) => {
        if (!isControllerClosed) {
          try {
            const data = JSON.stringify({ progress, status })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          } catch (error) {
            console.error('Failed to send data:', error)
          }
        }
      }

      const closeController = async () => {
        if (!isControllerClosed) {
          isControllerClosed = true
          try {
            await new Promise(resolve => setTimeout(resolve, 100))
            controller.close()
          } catch (error) {
            if (
              error instanceof TypeError &&
              error.message.includes('Controller is already closed')
            ) {
              return
            }
            console.error('Failed to close controller:', error)
          }
        }
      }

      try {
        // 현재 로그인한 유저 정보 가져오기
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          send(0, ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED)
          closeController()
          return
        }

        currentUser = user

        // Strava 토큰 가져오기
        const { data: tokenData, error: tokenError } = await supabase
          .from('strava_user_tokens')
          .select('access_token')
          .eq('user_id', user.id)
          .single()

        if (tokenError || !tokenData) {
          send(0, ERROR_CODES.AUTH.STRAVA_CONNECTION_REQUIRED)
          closeController()
          return
        }

        let page = 1
        let allActivities: StravaActivity[] = []
        let hasMore = true
        let totalPages = null

        // 첫 페이지 확인
        const firstPageResponse = await fetchStravaActivities(
          tokenData.access_token,
          page,
          supabase
        )
        if (firstPageResponse.length > 0) {
          totalPages = firstPageResponse.length < SYNC_CONFIG.FETCH_PAGE_SIZE ? 1 : null
          allActivities = firstPageResponse
          send(calculateProgress(1, totalPages, 0, null), 'fetching')
        }

        // 나머지 페이지 가져오기
        while (hasMore && firstPageResponse.length === SYNC_CONFIG.FETCH_PAGE_SIZE) {
          page++
          const pageActivities = await fetchStravaActivities(tokenData.access_token, page, supabase)

          if (pageActivities.length < SYNC_CONFIG.FETCH_PAGE_SIZE) {
            hasMore = false
            totalPages = page
          }

          if (pageActivities.length > 0) {
            allActivities = [...allActivities, ...pageActivities]
            send(calculateProgress(page, totalPages, 0, null), 'fetching')
          } else {
            hasMore = false
            totalPages = page - 1
          }
        }

        // 활동 데이터 처리
        const total = allActivities.length

        // 배치 처리
        for (let i = 0; i < total; i += SYNC_CONFIG.BATCH_SIZE) {
          const batch = allActivities.slice(i, i + SYNC_CONFIG.BATCH_SIZE)
          await processActivities(batch, user.id, supabase)
          send(calculateProgress(totalPages!, totalPages, i + batch.length, total), 'processing')
        }

        // 모든 데이터 처리가 완료된 후 strava_connected_at 업데이트 (최대 2번 재시도)
        let retryCount = 0
        const MAX_RETRIES = 2
        let userUpdateError = null

        while (retryCount <= MAX_RETRIES) {
          const { error } = await supabase
            .from('users')
            .update({
              strava_connected_at: new Date().toISOString(),
            })
            .eq('id', user.id)

          if (!error) {
            break
          }

          userUpdateError = error
          retryCount++

          if (retryCount <= MAX_RETRIES) {
            // 재시도 전 잠시 대기 (500ms)
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        if (userUpdateError && retryCount > MAX_RETRIES) {
          console.error('Failed to update strava_connected_at after retries:', userUpdateError)
          throw new Error(ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED)
        }

        send(100, 'completed')
        closeController()
      } catch (error: any) {
        console.error('Sync error:', error)

        // 에러 발생 시 토큰 삭제 및 strava_connected_at 초기화
        if (currentUser) {
          try {
            // 토큰 삭제
            await supabase.from('strava_user_tokens').delete().eq('user_id', currentUser.id)

            // strava_connected_at 초기화
            await supabase
              .from('users')
              .update({ strava_connected_at: null })
              .eq('id', currentUser.id)
          } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError)
          }
        }

        try {
          send(0, error.message || ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED)
        } catch (sendError) {
          console.error('Failed to send error to client:', sendError)
        } finally {
          closeController()
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
      retry: '1000',
    },
  })
}
