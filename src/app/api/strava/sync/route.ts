import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES } from '@/lib/constants/error'
import { SYNC_CONFIG } from '@/lib/constants/strava'
import { createProgressManager, fetchStravaActivities, processActivities } from '@/lib/utils/strava'
import { StravaActivity } from '@/lib/types/strava'
import { logError } from '@/lib/utils/log'

export async function GET() {
  const supabase = await createClient()
  const encoder = new TextEncoder()

  let isControllerClosed = false

  const stream = new ReadableStream({
    async start(controller) {
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
            logError('Failed to close controller:', {
              error,
              endpoint: 'api/strava/sync',
            })
          }
        }
      }

      const send = (progress: number, status: string) => {
        if (!isControllerClosed) {
          try {
            const data = JSON.stringify({ progress, status })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          } catch (error) {
            logError('Failed to send data:', {
              error,
              endpoint: 'api/strava/sync',
            })
          }
        }
      }

      const progress = createProgressManager(send)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        send(0, ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED)
        closeController()
        return
      }

      try {
        progress.setStage('connecting')

        // Strava 토큰 가져오기
        const { data: tokenData, error: tokenError } = await supabase
          .from('strava_user_tokens')
          .select('access_token')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .single()

        if (tokenError || !tokenData) {
          send(0, ERROR_CODES.AUTH.STRAVA_CONNECTION_REQUIRED)
          closeController()
          return
        }

        progress.setStage('fetching')

        let allActivities: StravaActivity[] = []

        // 최근 200개 활동 가져오기
        const activities = await fetchStravaActivities(tokenData.access_token, 1, supabase)

        if (activities.length > 0) {
          allActivities = activities
        }

        // 활동 데이터 처리
        progress.setStage('processing', allActivities.length)

        // 배치 처리
        for (let i = 0; i < allActivities.length; i += SYNC_CONFIG.BATCH_SIZE) {
          const batch = allActivities.slice(i, i + SYNC_CONFIG.BATCH_SIZE)
          await processActivities(batch, user.id, supabase)
          progress.addProcessedItems(batch.length)
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
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        if (userUpdateError && retryCount > MAX_RETRIES) {
          logError('Failed to update strava_connected_at after retries:', {
            error: userUpdateError,
            endpoint: 'api/strava/sync',
          })
          throw new Error(ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED)
        }

        // 완료 상태로 전환
        progress.setStage('completed')

        // UI에서 100% 표시를 보장하기 위한 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 100))
        closeController()
      } catch (error) {
        logError('Sync error:', {
          error,
          endpoint: 'api/strava/sync',
        })

        // 에러 발생 시 토큰 삭제 및 strava_connected_at 초기화
        if (user) {
          try {
            await supabase.from('strava_user_tokens').delete().eq('user_id', user.id)
            await supabase.from('users').update({ strava_connected_at: null }).eq('id', user.id)
          } catch (cleanupError) {
            logError('Cleanup error:', {
              error: cleanupError,
              endpoint: 'api/strava/sync',
            })
          }
        }

        try {
          send(
            0,
            error instanceof Error ? error.message : ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
          )
        } catch (sendError) {
          logError('Failed to send error to client:', {
            error: sendError,
            endpoint: 'api/strava/sync',
          })
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
