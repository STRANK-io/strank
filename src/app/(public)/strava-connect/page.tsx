'use client'

import PublicPageHeader from '@/components/common/PublicPageHeader'
import StepIndicator from '@/components/common/StepIndicator'
import Title from '@/components/features/stravaConnect/Title'
import LogoSection from '@/components/features/stravaConnect/LogoSection'
import ConnectButton from '@/components/features/stravaConnect/ConnectButton'
import { ROUTES } from '@/lib/constants/routes'
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
    <div className="mt-11">
      <PublicPageHeader title="스트라바 연동" href={ROUTES.PUBLIC.TERMS} />
      <StepIndicator />
      <Title />
      <LogoSection />
      <ConnectButton />
    </div>
  )
}
