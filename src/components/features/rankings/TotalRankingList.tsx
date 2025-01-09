import { RankingCard } from '@/components/features/rankings/RankingCard'
import { useTotalRankings } from '@/hooks/activities/api/useTotalRankings'
import { useRankingFilters } from '@/stores/rankingFilters'

export default function TotalRankingList() {
  const { filters } = useRankingFilters()
  const { data } = useTotalRankings(filters)

  if (!data.rankings.length) {
    return <p className="text-center text-brand-dark">아직 랭킹 데이터가 없습니다.</p>
  }

  const topActivity = data.rankings.slice(0, 1)
  const secondThirdActivities = data.rankings.slice(1, 3)
  const otherActivities = data.rankings.slice(3)

  return (
    <>
      <div>
        {topActivity.map(activity => (
          <RankingCard
            key={activity.id}
            activity={activity}
            isTop1
            variant="ranker"
            criteria={filters.criteria}
          />
        ))}
      </div>

      {secondThirdActivities.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {secondThirdActivities.map(activity => (
            <RankingCard
              key={activity.id}
              activity={activity}
              variant="ranker"
              criteria={filters.criteria}
            />
          ))}
        </div>
      )}

      {otherActivities.length > 0 && (
        <div className="space-y-4">
          {otherActivities.map(activity => (
            <RankingCard
              key={activity.id}
              activity={activity}
              variant="default"
              criteria={filters.criteria}
            />
          ))}
        </div>
      )}
    </>
  )
}
