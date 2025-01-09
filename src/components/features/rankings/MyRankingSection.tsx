'use client'

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import MyRanking from '@/components/features/rankings/MyRanking'

export function MyRankingSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold leading-[31.2px] text-brand-dark">나의 랭킹</h2>

      <Suspense fallback={<Skeleton className="h-[64px] w-full rounded-2xl" />}>
        <MyRanking />
      </Suspense>
    </section>
  )
}
