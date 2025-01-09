'use client'

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import TotalRankingList from '@/components/features/rankings/TotalRankingList'

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

function TotalRankingSkeleton() {
  return (
    <>
      <Skeleton className="h-[231px] w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[231px] rounded-2xl" />
        <Skeleton className="h-[231px] rounded-2xl" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
        ))}
      </div>
    </>
  )
}
