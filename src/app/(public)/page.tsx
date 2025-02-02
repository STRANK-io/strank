import Link from 'next/link'
import { GoogleSignButton } from '@/components/features/auth/GoogleSignButton'
import { LogInErrorHandler } from '@/components/features/login/ErrorHandler'
import { Suspense } from 'react'
import CompatibleWithStravaImage from '@/components/common/CompatibleWithStravaImage'
import StrankTitleLogo from '@/components/common/logos/StrankTitleLogo'
import StrankVerticalLogo from '@/components/common/logos/StrankVerticalLogo'

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Suspense>
        <LogInErrorHandler />
      </Suspense>

      <div className="flex flex-1 flex-col px-5">
        <section className="mb-3 mt-6 flex flex-col gap-6">
          <StrankTitleLogo width={120} height={23} />
          <div className="flex flex-col text-base font-bold leading-[21px] text-brand-dark">
            <span>지역별 랭킹으로 더 가까워진</span>
            <span>라이딩 커뮤니티</span>
          </div>
        </section>

        <section className="flex justify-center">
          <StrankVerticalLogo />
        </section>

        <section className="mb-[48px] mt-[50px] flex flex-col items-center gap-6">
          <GoogleSignButton />
          <Link
            href="https://bit.ly/strank"
            className="text-lg font-medium leading-[23px] text-brand-dark"
          >
            서비스 둘러보기
          </Link>
        </section>
      </div>

      <div className="flex h-full w-full items-center justify-center pb-3">
        <CompatibleWithStravaImage />
      </div>
    </div>
  )
}
