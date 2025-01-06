'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_CODES, ERROR_MESSAGES, ErrorMessageCode } from '@/lib/constants/error'

export function LogInErrorHandler() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        toast(
          <ToastContent
            text={
              ERROR_MESSAGES[error as ErrorMessageCode] ||
              ERROR_MESSAGES[ERROR_CODES.AUTH.LOGIN_FAILED]
            }
          />
        )
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [error])

  return null
}
