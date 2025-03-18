'use client'

import RankingsFilter from '@/components/features/rankings/filter/RankingsFilter'
import { MyRankingSection } from '@/components/features/rankings/MyRankingSection'
import { TotalRankingSection } from '@/components/features/rankings/TotalRankingSection'
import { ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'

export default function RankingsPage() {
  return (
    <div className="mt-12 space-y-12 px-5 pb-[150px]">
      <div className="space-y-3">
        <RankingsFilter />
        <div className="rounded-xl bg-white px-4 py-2 shadow-[0px_8px_16px_0px_#00000017]">
          <Link
            href="https://strank.framer.website/notice/description-error"
            className="flex items-center text-sm text-gray-600"
          >
            디스크립션 오류 해결 방법
            <ChevronRightIcon className="size-4" />
          </Link>
        </div>
      </div>
      <MyRankingSection />
      <TotalRankingSection />
    </div>
  )
}
