'use client'

import StepIndicator from '@/components/common/StepIndicator'
import Title from '@/components/features/stravaConnect/Title'
import LogoSection from '@/components/features/stravaConnect/LogoSection'
import ConnectButton from '@/components/features/stravaConnect/ConnectButton'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_CODES, ERROR_MESSAGES, ErrorMessageCode } from '@/lib/constants/error'

export default function StravaConnectPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        toast(
          <ToastContent
            text={
              ERROR_MESSAGES[error as ErrorMessageCode] ||
              ERROR_MESSAGES[ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED]
            }
          />
        )
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div>
      <StepIndicator />
      <Title />
      <LogoSection />
      <ConnectButton />
    </div>
  )
}
