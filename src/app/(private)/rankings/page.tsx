import RankingsFilter from '@/components/features/rankings/filter/RankingsFilter'
import { MyRankingSection } from '@/components/features/rankings/MyRankingSection'
import { TotalRankingSection } from '@/components/features/rankings/TotalRankingSection'

export default function RankingsPage() {
  return (
    <div className="mt-12 space-y-12 px-5 pb-[150px]">
      <RankingsFilter />
      <MyRankingSection />
      <TotalRankingSection />
    </div>
  )
}
