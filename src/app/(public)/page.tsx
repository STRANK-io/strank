'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { BETA_TESTER_RECRUITMENT_CLOSED_MESSAGE } from '@/lib/constants/auth'
import { cn } from '@/lib/utils/cn'

export default function Home() {
  const { toast } = useToast()

  const handleSignIn = () => {
    toast({
      description: BETA_TESTER_RECRUITMENT_CLOSED_MESSAGE,
      duration: 1500,
      className: cn(
        'bg-black text-white p-4 text-base leading-[20px] rounded-[8px] whitespace-pre-line bottom-[34px] border-0'
      ),
    })
  }

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
              src="/strank-vertical.png"
              alt="Strank Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="mb-[48px] mt-[91px] flex flex-col items-center gap-6">
          <Button
            size="lg"
            className="h-[65px] w-full rounded-2xl bg-brand-primary text-lg font-medium leading-[23px] hover:bg-brand-primary/90"
            onClick={handleSignIn}
          >
            Sign in with Google
          </Button>
          {/* //TODO: 서비스 둘러보기 링크 추가 */}
          <Link href="" className="text-lg font-medium leading-[23px] text-brand-dark">
            서비스 둘러보기
          </Link>
        </div>
      </div>
    </div>
  )
}
