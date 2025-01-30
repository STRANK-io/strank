'use client'

import { Suspense } from 'react'
import MyRanking from '@/components/features/rankings/MyRankingSection/MyRanking'
import MyRankingSkeleton from '@/components/features/rankings/MyRankingSection/MyRankingSkeleton'

export function MyRankingSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold leading-[31.2px] text-brand-dark">나의 랭킹</h2>
      <Suspense fallback={<MyRankingSkeleton />}>
        <MyRanking />
      </Suspense>
    </section>
  )
}
