import PublicPageHeader from '@/components/common/PublicPageHeader'
import StepIndicator from '@/components/common/StepIndicator'
import StravaImage from '@/components/features/terms/StravaImage'
import TermsAgreement from '@/components/features/terms/TermsAgreement'
import AgreeButton from '@/components/features/terms/AgreeButton'

export default function TermsPage() {
  return (
    <div className="mb-[143px] min-h-screen">
      <PublicPageHeader title="약관 동의" href="/" />
      <StepIndicator />
      <StravaImage />
      <TermsAgreement />
      <div className="fixed bottom-[41px] flex w-full justify-center px-5">
        <AgreeButton />
      </div>
    </div>
  )
}
