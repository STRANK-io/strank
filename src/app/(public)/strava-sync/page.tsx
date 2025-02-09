'use client'

import { useEffect, useState } from 'react'
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
  const router = useRouter()

  useEffect(() => {
    const MAX_RETRIES = 5
    const RETRY_DELAY = 2000
    const CONNECTION_TIMEOUT = 60000

    const handleError = ({ path, errorStatus }: { path: string; errorStatus?: string }) => {
      router.push(`${path}?error=${errorStatus || ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED}`)
    }

    const connectEventSource = () => {
      let timeoutId: NodeJS.Timeout
      const eventSource = new EventSource('/api/strava/sync')

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

      eventSource.addEventListener('open', () => {
        setupTimeout()
      })

      // 브라우저의 기본 재연결 간격을 2초로 설정
      const retryEvent = new Event('retry') as Event & { retryTime: number }
      retryEvent.retryTime = 2000
      eventSource.dispatchEvent(retryEvent)

      // 서버로부터 데이터를 받을 때마다 실행
      eventSource.onmessage = event => {
        setupTimeout() // 메시지를 받을 때마다 타임아웃 리셋

        try {
          const data = JSON.parse(event.data)

          // 에러 상태 처리
          if (Object.values(ERROR_CODES).flat().includes(data.status)) {
            eventSource.close()
            clearTimeout(timeoutId)
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
            router.push(ROUTES.PRIVATE.RANKINGS)
            return
          }

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
        eventSource.close()

        if (connectionAttempts < MAX_RETRIES) {
          setConnectionAttempts(prev => prev + 1)
          // 지수 백오프를 적용한 재시도 간격
          setTimeout(connectEventSource, RETRY_DELAY * Math.pow(2, connectionAttempts))
        } else {
          logError('Max retries reached, redirecting to error page', {
            endpoint: 'strava-sync',
          })
          handleError({ path: ROUTES.PUBLIC.STRAVA_CONNECT })
        }
      }

      return () => {
        clearTimeout(timeoutId)
        eventSource.close()
      }
    }

    connectEventSource()
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
