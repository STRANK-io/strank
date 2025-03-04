'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { cn } from '@/lib/utils/cn'
import { logError } from '@/lib/utils/log'
import StrankVerticalLogo from '@/components/common/logos/StrankVerticalLogo'
import CompatibleWithStravaImage from '@/components/common/CompatibleWithStravaImage'

export default function StravaSyncPage() {
  const [progress, setProgress] = useState(0)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const isSyncingRef = useRef(true)
  const router = useRouter()

  useEffect(() => {
    const MAX_RETRIES = 5
    const RETRY_DELAY = 2000
    const CONNECTION_TIMEOUT = 60000
    const PING_INTERVAL = 10000

    const handleError = ({ path, errorStatus }: { path: string; errorStatus?: string }) => {
      router.push(`${path}?error=${errorStatus || ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED}`)
    }

    // 동기화 중단 요청 함수
    const sendAbortRequest = async () => {
      if (!isSyncingRef.current) return

      try {
        await fetch('/api/strava/sync/abort', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          keepalive: true, // 페이지가 언로드된 후에도 요청이 완료되도록 함
        })
      } catch (error) {
        logError('Failed to send abort signal:', {
          error,
          endpoint: 'strava-sync',
        })
      }
    }

    // 페이지 이탈 시 서버에 알림
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isSyncingRef.current) {
        // 동기화 중단 요청만 전송 (사용자 알림 없음)
        sendAbortRequest()
      }
    }

    // 뒤로가기 버튼 처리
    const handlePopState = () => {
      if (isSyncingRef.current) {
        isSyncingRef.current = false
        sendAbortRequest()
      }
    }

    // 페이지 이탈 이벤트 리스너 등록
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    const connectEventSource = () => {
      let timeoutId: NodeJS.Timeout
      let pingTimeoutId: NodeJS.Timeout
      let lastPingTime = Date.now()

      // 이전 EventSource가 있으면 정리
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource('/api/strava/sync')
      eventSourceRef.current = eventSource
      isSyncingRef.current = true

      const setupTimeout = () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          eventSource.close()
          if (connectionAttempts < MAX_RETRIES) {
            setConnectionAttempts(prev => prev + 1)
            setTimeout(connectEventSource, RETRY_DELAY)
          } else {
            handleError({ path: ROUTES.PUBLIC.STRAVA_CONNECT })
          }
        }, CONNECTION_TIMEOUT)
      }

      // 핑 체크 설정
      const setupPingCheck = () => {
        clearTimeout(pingTimeoutId)
        pingTimeoutId = setTimeout(() => {
          const timeSinceLastPing = Date.now() - lastPingTime

          if (timeSinceLastPing > PING_INTERVAL * 3) {
            logError('Ping timeout detected', {
              timeSinceLastPing,
              endpoint: 'strava-sync',
            })

            eventSource.close()
            if (connectionAttempts < MAX_RETRIES) {
              setConnectionAttempts(prev => prev + 1)
              setTimeout(connectEventSource, RETRY_DELAY)
            } else {
              handleError({
                path: ROUTES.PUBLIC.STRAVA_CONNECT,
                errorStatus: ERROR_CODES.NETWORK.CONNECTION_LOST,
              })
            }
          } else {
            setupPingCheck()
          }
        }, PING_INTERVAL)
      }

      eventSource.addEventListener('open', () => {
        setupTimeout()
        setupPingCheck()
      })

      // 브라우저의 기본 재연결 간격을 2초로 설정
      const retryEvent = new Event('retry') as Event & { retryTime: number }
      retryEvent.retryTime = 2000
      eventSource.dispatchEvent(retryEvent)

      // 서버로부터 데이터를 받을 때마다 실행
      eventSource.onmessage = event => {
        setupTimeout() // 메시지를 받을 때마다 타임아웃 리셋
        lastPingTime = Date.now() // 핑 시간 업데이트

        try {
          const data = JSON.parse(event.data)

          // 핑 메시지 처리
          if (data.ping) {
            lastPingTime = Date.now()
            return
          }

          // 에러 상태 처리
          if (Object.values(ERROR_CODES).flat().includes(data.status)) {
            eventSource.close()
            clearTimeout(timeoutId)
            clearTimeout(pingTimeoutId)
            isSyncingRef.current = false

            const path =
              data.status === ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED
                ? ROUTES.PUBLIC.HOME
                : ROUTES.PUBLIC.STRAVA_CONNECT
            handleError({ path, errorStatus: data.status })

            return
          }

          // 진행 상태 처리
          if (data.status === 'completed') {
            eventSource.close()
            clearTimeout(timeoutId)
            clearTimeout(pingTimeoutId)
            isSyncingRef.current = false
            router.push(ROUTES.PRIVATE.RANKINGS)
            return
          }

          // 토큰 갱신 상태 처리
          if (data.status === 'token_refreshed') {
            return
          }

          // 일반 진행 상태 업데이트
          setProgress(data.progress)
        } catch (error) {
          logError('Failed to parse message:', {
            error,
            endpoint: 'strava-sync',
          })
          // JSON 파싱 에러는 무시하고 계속 진행
        }
      }

      eventSource.onerror = error => {
        logError('EventSource error:', {
          error,
          endpoint: 'strava-sync',
        })
        clearTimeout(timeoutId)
        clearTimeout(pingTimeoutId)
        eventSource.close()

        if (connectionAttempts < MAX_RETRIES) {
          setConnectionAttempts(prev => prev + 1)
          // 지수 백오프를 적용한 재시도 간격
          setTimeout(connectEventSource, RETRY_DELAY * Math.pow(2, connectionAttempts))
        } else {
          logError('Max retries reached, redirecting to error page', {
            endpoint: 'strava-sync',
          })
          isSyncingRef.current = false
          handleError({
            path: ROUTES.PUBLIC.STRAVA_CONNECT,
            errorStatus: ERROR_CODES.NETWORK.CONNECTION_LOST,
          })
        }
      }

      return () => {
        clearTimeout(timeoutId)
        clearTimeout(pingTimeoutId)
        eventSource.close()
      }
    }

    connectEventSource()

    // 컴포넌트 언마운트 시 정리
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)

      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      // 페이지 이동 시 동기화 중단 요청 전송
      if (isSyncingRef.current) {
        isSyncingRef.current = false
        sendAbortRequest()
      }
    }
  }, [router, connectionAttempts])

  return (
    <div className="pt-[50px]">
      <div className={cn('fixed left-0 top-0 h-2 w-full', 'bg-brand-disabled')}>
        <div
          className="h-full rounded-full bg-brand-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex h-full flex-col gap-4">
        <div className="flex w-full flex-col gap-6 px-5">
          <h2 className="text-[32px] font-bold leading-[41.6px]">연동중</h2>
          <p className="whitespace-pre-line text-base font-bold leading-[20.8px] text-brand-dark">
            {`소중한 운동정보를 가져오고 있습니다. (최근200개)\n조금만 기다려 주세요.\n자동으로 첫화면으로 이동됩니다.`}
          </p>
          {connectionAttempts > 0 && (
            <p className="text-sm text-brand-secondary">
              연결 재시도 중... ({connectionAttempts}/{5})
            </p>
          )}
        </div>

        <div className="mt-[11px] flex justify-center">
          <StrankVerticalLogo />
        </div>

        <div className="flex w-full justify-center">
          <CompatibleWithStravaImage />
        </div>
      </div>
    </div>
  )
}
