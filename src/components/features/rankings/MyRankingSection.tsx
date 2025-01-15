'use client'

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import MyRanking from '@/components/features/rankings/MyRanking'
import OutlineButton from '@/components/common/OutlineButton'
import { Caption } from '@/components/common/Caption'

export function MyRankingSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold leading-[31.2px] text-brand-dark">나의 랭킹</h2>
      <Suspense fallback={<MyRankingLoading />}>
        <MyRanking />
      </Suspense>
    </section>
  )
}

const MyRankingLoading = () => {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[72px] w-full rounded-2xl" />
      <div className="flex flex-col gap-[7px]">
        <OutlineButton text="랭킹 이미지 생성" onClick={() => {}} />
        <Caption text="* 이미지를 다운로드 후, 여러 SNS에 공유해보세요!" />
      </div>
    </div>
  )
}
