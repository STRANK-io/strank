import StepIndicator from '@/components/common/StepIndicator'
import TermsAgreement from '@/components/features/terms/TermsAgreement'
import AgreeButton from '@/components/features/terms/AgreeButton'
import StrankDefaultLogo from '@/components/common/logos/StrankDefaultLogo'

export default function TermsPage() {
  return (
    <div className="pb-[120px]">
      <StepIndicator />
      <div className="mb-11 mt-5 flex flex-col items-center justify-center">
        <StrankDefaultLogo />
      </div>
      <TermsAgreement />
      <div className="fixed bottom-6 left-1/2 w-full max-w-[450px] -translate-x-1/2 px-5">
        <AgreeButton />
      </div>
    </div>
  )
}
