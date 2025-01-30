'use client'

import { Suspense } from 'react'
import TotalRankingList from '@/components/features/rankings/TotalRankingSection/TotalRankingList'
import TotalRankingSkeleton from '@/components/features/rankings/TotalRankingSection/TotalRankingSkeleton'

export function TotalRankingSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold leading-[31.2px] text-brand-dark">전체 랭킹</h2>
      <Suspense fallback={<TotalRankingSkeleton />}>
        <TotalRankingList />
      </Suspense>
    </section>
  )
}
