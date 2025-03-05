'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { cn } from '@/lib/utils/cn'
import { logError } from '@/lib/utils/log'
import StrankVerticalLogo from '@/components/common/logos/StrankVerticalLogo'
import CompatibleWithStravaImage from '@/components/common/CompatibleWithStravaImage'

// 상수 정의
const MAX_RETRIES = 2
const RETRY_DELAY = 2000
const CONNECTION_TIMEOUT = 60000
const PING_INTERVAL = 10000

export default function StravaSyncPage() {
  const [progress, setProgress] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const router = useRouter()

  useEffect(() => {
    // 오류 발생 또는 완료 시 랭킹 페이지로 이동
    const completeAndRedirect = () => {
      // 진행 상태를 100%로 설정
      setProgress(100)

      // 잠시 후 랭킹 페이지로 이동
      setTimeout(() => {
        router.replace(ROUTES.PRIVATE.RANKINGS)
      }, 500) // 사용자가 100% 진행 상태를 볼 수 있도록 약간의 지연 추가
    }

    const connectEventSource = () => {
      let timeoutId: NodeJS.Timeout
      let pingTimeoutId: NodeJS.Timeout
      let lastPingTime = Date.now()
      let retryCount = 0

      // 이전 EventSource가 있으면 정리
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource('/api/strava/sync')
      eventSourceRef.current = eventSource

      const setupTimeout = () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          eventSource.close()
          if (retryCount < MAX_RETRIES) {
            retryCount++
            setIsRetrying(true)
            setTimeout(connectEventSource, RETRY_DELAY)
          } else {
            logError('Connection timeout, redirecting to rankings', {
              endpoint: 'strava-sync',
            })
            completeAndRedirect()
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
            if (retryCount < MAX_RETRIES) {
              retryCount++
              setIsRetrying(true)
              setTimeout(connectEventSource, RETRY_DELAY)
            } else {
              logError('Max ping retries reached, redirecting to rankings', {
                endpoint: 'strava-sync',
              })
              completeAndRedirect()
            }
          } else {
            setupPingCheck()
          }
        }, PING_INTERVAL)
      }

      eventSource.addEventListener('open', () => {
        setupTimeout()
        setupPingCheck()
        setIsRetrying(false)
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

            logError('Error received from server:', {
              status: data.status,
              endpoint: 'strava-sync',
            })

            completeAndRedirect()
            return
          }

          // 진행 상태 처리
          if (data.status === 'completed') {
            eventSource.close()
            clearTimeout(timeoutId)
            clearTimeout(pingTimeoutId)
            completeAndRedirect()
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

        if (retryCount < MAX_RETRIES) {
          retryCount++
          setIsRetrying(true)
          // 지수 백오프를 적용한 재시도 간격
          setTimeout(connectEventSource, RETRY_DELAY * Math.pow(2, retryCount))
        } else {
          logError('Max retries reached, redirecting to rankings', {
            endpoint: 'strava-sync',
          })
          completeAndRedirect()
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
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [router])

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
          {isRetrying && <p className="text-sm text-brand-secondary">연결 재시도 중...</p>}
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
