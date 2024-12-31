'use client'

import Image from 'next/image'
import Link from 'next/link'
import { GoogleSignButton } from '@/components/features/auth/GoogleSignButton'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { ERROR_CODES, ERROR_MESSAGES, ErrorMessageCode } from '@/lib/constants/error'
import { ToastContent } from '@/components/common/ToastContent'

export default function Home() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        toast(
          <ToastContent
            text={
              ERROR_MESSAGES[error as ErrorMessageCode] ||
              ERROR_MESSAGES[ERROR_CODES.AUTH.LOGIN_FAILED]
            }
          />
        )
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-center px-[10px] py-4">
        <h1 className="text-xl font-bold leading-[25px]">로그인</h1>
      </div>
      <div className="flex flex-1 flex-col px-5">
        <div className="mb-8 mt-12 flex flex-col gap-6">
          <h2 className="text-[32px] font-bold leading-[42px]">STRANK</h2>
          <div className="flex flex-col text-base font-bold leading-[21px] text-brand-dark">
            <span>지역별 랭킹으로 더 가까워진</span>
            <span>라이딩 커뮤니티</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="relative h-[313px] w-[313px]">
            <Image
              src="/images/strank-vertical.png"
              alt="Strank Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

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
