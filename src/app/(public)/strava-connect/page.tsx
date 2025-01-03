import PublicPageHeader from '@/components/common/PublicPageHeader'
import StepIndicator from '@/components/common/StepIndicator'
import Title from '@/components/features/stravaConnect/Title'
import LogoSection from '@/components/features/stravaConnect/LogoSection'
import ConnectButton from '@/components/features/stravaConnect/ConnectButton'
import { ROUTES } from '@/lib/constants/routes'

export default function StravaConnectPage() {
  return (
    <div className="min-h-screen">
      <PublicPageHeader title="스트라바 연동" href={ROUTES.PUBLIC.TERMS} />
      <StepIndicator />
      <Title />
      <LogoSection />
      <ConnectButton />
    </div>
  )
}
