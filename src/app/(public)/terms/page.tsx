import PublicPageHeader from '@/components/common/PublicPageHeader'
import StepIndicator from '@/components/common/StepIndicator'
import StrankImage from '@/components/features/terms/StrankImage'
import TermsAgreement from '@/components/features/terms/TermsAgreement'
import AgreeButton from '@/components/features/terms/AgreeButton'
import { ROUTES } from '@/lib/constants/routes'

export default function TermsPage() {
  return (
    <div className="mb-[143px] mt-11">
      <PublicPageHeader title="약관 동의" href={ROUTES.PUBLIC.HOME} />
      <StepIndicator />
      <StrankImage />
      <TermsAgreement />
      <div className="fixed bottom-12 left-0 right-0 mx-auto max-w-[393px] px-5">
        <AgreeButton />
      </div>
    </div>
  )
}
