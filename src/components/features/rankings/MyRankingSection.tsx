'use client'

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import MyRanking from '@/components/features/rankings/MyRanking'
import OutlineButton from '@/components/features/rankings/shareToInsta/OutlineButton'

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
      <div className="flex gap-2">
        <OutlineButton text="Instagram 공유" onClick={() => {}} />
        <OutlineButton text="이미지 업로드" onClick={() => {}} />
      </div>
    </div>
  )
}
