import TermsAgreement from '@/components/features/terms/TermsAgreement'
import StrankDefaultLogo from '@/components/common/logos/StrankDefaultLogo'

export default function TermsPage() {
  return (
    <div className="pb-[120px]">
      <div className="mb-11 mt-5 flex flex-col items-center justify-center">
        <h1 className="text-xl font-bold leading-[24px]">개인정보처리방침</h1>
      </div>
      <div className="mb-11 mt-5 flex flex-col items-center justify-center">
        <StrankDefaultLogo />
      </div>
      <TermsAgreement />
    </div>
  )
}
