'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_CODES, ERROR_MESSAGES, ErrorMessageCode } from '@/lib/constants/error'

export function StravaConnectErrorHandler() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        // 오류 메시지 결정
        const errorMessage =
          ERROR_MESSAGES[error as ErrorMessageCode] ||
          ERROR_MESSAGES[ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED]

        // 오류 유형에 따른 토스트 지속 시간 설정
        const duration = isNetworkError(error) ? 8000 : 5000

        toast(<ToastContent text={errorMessage} />, {
          duration: duration,
        })
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [error])

  return null
}

// 네트워크 관련 오류인지 확인하는 함수
function isNetworkError(errorCode: string): boolean {
  return (
    errorCode === ERROR_CODES.NETWORK.CONNECTION_TIMEOUT ||
    errorCode === ERROR_CODES.NETWORK.CONNECTION_LOST ||
    errorCode === ERROR_CODES.NETWORK.REQUEST_FAILED ||
    errorCode === ERROR_CODES.STRAVA.NETWORK_ERROR
  )
}
