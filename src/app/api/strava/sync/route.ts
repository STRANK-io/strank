import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES, type ErrorMessageCode } from '@/lib/constants/error'
import { SYNC_CONFIG } from '@/lib/constants/strava'
import { createProgressManager, fetchStravaActivities, processActivities } from '@/lib/utils/strava'
import { StravaActivity } from '@/lib/types/strava'
import { logError } from '@/lib/utils/log'
import { refreshStravaToken } from '@/lib/utils/stravaToken'

// 연결 상태 확인을 위한 핑 간격 (밀리초)
const PING_INTERVAL = 10000
// 요청 타임아웃 (밀리초)
const REQUEST_TIMEOUT = 30000

export async function GET() {
  const supabase = await createClient()
  const encoder = new TextEncoder()

  let isControllerClosed = false
  let pingInterval: NodeJS.Timeout | null = null
  let lastPingTime = Date.now()
  const abortController = new AbortController()

  const stream = new ReadableStream({
    async start(controller) {
      const closeController = async () => {
        if (!isControllerClosed) {
          isControllerClosed = true

          // 핑 인터벌 정리
          if (pingInterval) {
            clearInterval(pingInterval)
            pingInterval = null
          }

          // 진행 중인 요청 중단
          abortController.abort()

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
            lastPingTime = Date.now() // 데이터 전송 시 핑 시간 업데이트
          } catch (error) {
            logError('Failed to send data:', {
              error,
              endpoint: 'api/strava/sync',
            })
          }
        }
      }

      // 클라이언트 연결 상태 확인을 위한 핑 메시지 전송
      const sendPing = () => {
        if (!isControllerClosed) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ping: Date.now() })}\n\n`))
          } catch (error) {
            logError('Failed to send ping:', {
              error,
              endpoint: 'api/strava/sync',
            })
            closeController()
          }
        }
      }

      // 핑 인터벌 설정
      pingInterval = setInterval(() => {
        sendPing()

        // 마지막 핑으로부터 일정 시간이 지나면 연결이 끊긴 것으로 간주
        const timeSinceLastPing = Date.now() - lastPingTime
        if (timeSinceLastPing > REQUEST_TIMEOUT) {
          logError('Connection timeout detected', {
            timeSinceLastPing,
            endpoint: 'api/strava/sync',
          })
          closeController()
        }
      }, PING_INTERVAL)

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

        // * Strava 토큰 가져오기 및 갱신 확인
        try {
          const { needsRefresh, accessToken } = await refreshStravaToken(user.id)

          if (needsRefresh) {
            progress.setStage('token_refreshed')
            send(0, 'token_refreshed')
          }

          progress.setStage('fetching')

          let allActivities: StravaActivity[] = []

          // * 최근 200개 활동 가져오기 (재시도 로직 적용)
          const activities = await fetchStravaActivities(
            accessToken,
            1,
            supabase,
            abortController.signal
          )

          if (activities.length > 0) {
            allActivities = activities
          }

          // 활동 데이터 처리
          progress.setStage('processing', allActivities.length)

          // * 배치 처리
          for (let i = 0; i < allActivities.length; i += SYNC_CONFIG.BATCH_SIZE) {
            // 연결이 끊겼는지 확인
            if (isControllerClosed) {
              throw new Error(ERROR_CODES.STRAVA.CONNECTION_ABORTED)
            }

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
        } catch (tokenError) {
          logError('Token error:', {
            error: tokenError,
            endpoint: 'api/strava/sync',
          })
          send(0, ERROR_CODES.STRAVA.TOKEN_REFRESH_FAILED)
          closeController()
          return
        }
      } catch (error) {
        logError('Sync error:', {
          error,
          endpoint: 'api/strava/sync',
        })

        // 에러 코드 결정
        let errorCode: ErrorMessageCode = ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED

        if (error instanceof Error) {
          if (error.message === ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED) {
            errorCode = ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED
          } else if (error.message === ERROR_CODES.STRAVA.CONNECTION_ABORTED) {
            errorCode = ERROR_CODES.STRAVA.CONNECTION_ABORTED
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorCode = ERROR_CODES.STRAVA.NETWORK_ERROR
          }
        }

        // 에러 발생 시 토큰 삭제 및 strava_connected_at 초기화
        if (user) {
          try {
            // 중단 API 호출을 통해 정리 작업 수행
            const abortResponse = await fetch(
              new URL('/api/strava/sync/abort', process.env.NEXT_PUBLIC_APP_URL).toString(),
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            )

            if (!abortResponse.ok) {
              // 중단 API 호출 실패 시 직접 정리 시도
              await supabase.from('strava_user_tokens').delete().eq('user_id', user.id)
              await supabase.from('users').update({ strava_connected_at: null }).eq('id', user.id)

              // 최근 30분 이내 생성된 활동 데이터 삭제
              const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
              await supabase
                .from('activities')
                .delete()
                .eq('user_id', user.id)
                .gte('created_at', thirtyMinutesAgo)
            }
          } catch (cleanupError) {
            logError('Cleanup error:', {
              error: cleanupError,
              endpoint: 'api/strava/sync',
            })
          }
        }

        try {
          send(0, errorCode)
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
