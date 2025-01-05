'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'

export default function StravaSyncPage() {
  const [progress, setProgress] = useState(0)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000 // 1초로 줄임
    const CONNECTION_TIMEOUT = 5000 // 5초로 줄임

    const handleError = () => {
      router.push(
        `${ROUTES.PUBLIC.STRAVA_CONNECT}?error=${ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED}`
      )
    }

    const connectEventSource = () => {
      const eventSource = new EventSource('/api/strava/sync')
      eventSource.addEventListener('open', () => {
        console.log('SSE Connection opened')
        clearTimeout(timeoutId)
      })

      // 브라우저의 기본 재연결 간격을 1초로 설정
      const retryEvent = new Event('retry')
      ;(retryEvent as any).retryTime = 1000
      eventSource.dispatchEvent(retryEvent)

      const timeoutId = setTimeout(() => {
        eventSource.close()
        if (connectionAttempts < MAX_RETRIES) {
          setConnectionAttempts(prev => prev + 1)
          setTimeout(connectEventSource, RETRY_DELAY)
        } else {
          handleError()
        }
      }, CONNECTION_TIMEOUT)

      // 서버로부터 데이터를 받을 때마다 실행
      eventSource.onmessage = event => {
        const data = JSON.parse(event.data)
        clearTimeout(timeoutId) // 메시지를 받으면 타임아웃 취소

        // 에러 상태 처리
        if (Object.values(ERROR_CODES).flat().includes(data.status)) {
          eventSource.close()
          if (data.status === ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED) {
            router.push(`${ROUTES.PUBLIC.HOME}?error=${data.status}`)
          } else {
            router.push(`${ROUTES.PUBLIC.STRAVA_CONNECT}?error=${data.status}`)
          }
          return
        }

        // 진행 상태 처리
        if (data.status === 'completed') {
          eventSource.close()
          router.push(ROUTES.PRIVATE.RANKINGS)
          return
        }

        setProgress(data.progress)
      }

      eventSource.onerror = error => {
        console.error('EventSource error:', error)
        eventSource.close()
        clearTimeout(timeoutId)
        if (connectionAttempts < MAX_RETRIES) {
          setConnectionAttempts(prev => prev + 1)
          console.log(`Retrying connection... Attempt ${connectionAttempts + 1}/${MAX_RETRIES}`)
          setTimeout(connectEventSource, RETRY_DELAY)
        } else {
          console.error('Max retries reached, redirecting to error page')
          handleError()
        }
      }

      // 컴포넌트가 언마운트될 때 연결을 종료
      return () => {
        clearTimeout(timeoutId)
        eventSource.close()
      }
    }

    connectEventSource()
  }, [router, connectionAttempts])

  return (
    <div className="pt-[104px]">
      <div className="bg-brand-disabled fixed left-0 top-0 h-2 w-full">
        <div
          className="h-full rounded-full bg-brand-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex w-full flex-col gap-6 px-5">
        <h2 className="text-[32px] font-bold leading-[41.6px]">연동중</h2>
        <p className="whitespace-pre-line text-base font-bold leading-[20.8px] text-brand-dark">
          {`소중한 운동정보를 가져오고 있습니다\n조금만 기다려 주세요\n자동으로 첫화면으로 이동됩니다`}
        </p>
      </div>
      <Image
        src="/images/strank-vertical-logo.png"
        alt="Strank Logo"
        width={313}
        height={313}
        className="mx-auto mb-[146px] mt-[11px] object-contain"
        priority
      />
      <Image
        src="/images/with-strava-logo.png"
        alt="Strank Logo"
        width={130}
        height={56}
        className="mx-auto object-contain"
        priority
      />
    </div>
  )
}
