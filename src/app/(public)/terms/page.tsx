import StepIndicator from '@/components/common/StepIndicator'
import StrankImage from '@/components/features/terms/StrankImage'
import TermsAgreement from '@/components/features/terms/TermsAgreement'
import AgreeButton from '@/components/features/terms/AgreeButton'

export default function TermsPage() {
  return (
    <div className="pb-[130px]">
      <StepIndicator />
      <div className="max-h-[calc(100dvh-350px)] overflow-y-auto">
        <StrankImage />
        <TermsAgreement />
      </div>
      <div className="fixed bottom-12 left-1/2 w-full max-w-[450px] -translate-x-1/2 px-5">
        <AgreeButton />
      </div>
    </div>
  )
}
