import StepIndicator from '@/components/common/StepIndicator'
import Title from '@/components/features/stravaConnect/Title'
import LogoSection from '@/components/features/stravaConnect/LogoSection'
import ConnectButton from '@/components/features/stravaConnect/ConnectButton'
import { Suspense } from 'react'
import { StravaConnectErrorHandler } from '@/components/features/stravaConnect/ErrorHandler'

export default function StravaConnectPage() {
  return (
    <div>
      <Suspense>
        <StravaConnectErrorHandler />
      </Suspense>
      <StepIndicator />
      <Title />
      <LogoSection />
      <ConnectButton />
    </div>
  )
}
