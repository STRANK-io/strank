import Image from 'next/image'
import Link from 'next/link'
import { GoogleSignButton } from '@/components/features/auth/GoogleSignButton'
import { LogInErrorHandler } from '@/components/features/login/ErrorHandler'
import { Suspense } from 'react'

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Suspense>
        <LogInErrorHandler />
      </Suspense>

      <div className="flex flex-1 flex-col px-5">
        <div className="mb-8 mt-12 flex flex-col gap-6">
          <h2 className="text-[32px] font-bold leading-[42px]">STRANK</h2>
          <div className="flex flex-col text-base font-bold leading-[21px] text-brand-dark">
            <span>지역별 랭킹으로 더 가까워진</span>
            <span>라이딩 커뮤니티</span>
          </div>
        </div>

        <Image
          src="/images/strank-vertical-logo.png"
          alt="Strank Logo"
          width={313}
          height={313}
          className="mx-auto object-contain"
          priority
        />

        <div className="mb-[48px] mt-[91px] flex flex-col items-center gap-6">
          <GoogleSignButton />
          <Link
            href="https://bit.ly/strank"
            className="text-lg font-medium leading-[23px] text-brand-dark"
          >
            서비스 둘러보기
          </Link>
        </div>
      </div>
    </div>
  )
}
