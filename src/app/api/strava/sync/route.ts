import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES, type ErrorMessageCode } from '@/lib/constants/error'
import { SYNC_CONFIG } from '@/lib/constants/strava'
import { createProgressManager, fetchStravaActivities, processActivities } from '@/lib/utils/strava'
import { logError } from '@/lib/utils/log'
import { refreshStravaToken } from '@/lib/utils/stravaToken'
import { generateActivityHash } from '@/lib/utils/activity'

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

          // * 최근 200개 활동 가져오기 (재시도 로직 적용)
          const activities = await fetchStravaActivities(
            accessToken,
            1,
            supabase,
            abortController.signal
          )

          // 활동 데이터 처리
          progress.setStage('processing', activities.length)

          // 각 활동에 대해 해시값 생성
          const activitiesWithHash = activities.map(activity => ({
            ...activity,
            activity_hash: generateActivityHash(
              user.id,
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

          // * 배치 처리
          for (let i = 0; i < uniqueActivities.length; i += SYNC_CONFIG.BATCH_SIZE) {
            // 연결이 끊겼는지 확인
            if (isControllerClosed) {
              throw new Error(ERROR_CODES.STRAVA.CONNECTION_ABORTED)
            }

            const batch = uniqueActivities.slice(i, i + SYNC_CONFIG.BATCH_SIZE)
            await processActivities(batch, user.id, supabase)
            progress.addProcessedItems(batch.length)
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
          send(99, ERROR_CODES.STRAVA.TOKEN_REFRESH_FAILED)
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

        try {
          // 오류 발생 시에도 높은 진행률을 표시
          send(99, errorCode)
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
