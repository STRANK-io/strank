import PublicPageHeader from '@/components/common/PublicPageHeader'
import StepIndicator from '@/components/common/StepIndicator'
import Title from '@/components/features/stravaConnect/Title'
import LogoSection from '@/components/features/stravaConnect/LogoSection'
import ConnectButton from '@/components/features/stravaConnect/ConnectButton'

export default function StravaConnectPage() {
  return (
    <div className="min-h-screen">
      <PublicPageHeader title="스트라바 연동" />
      <StepIndicator />
      <Title />
      <LogoSection />
      <ConnectButton />
    </div>
  )
}
