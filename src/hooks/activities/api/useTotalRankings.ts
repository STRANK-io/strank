import { useSuspenseQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'
import { ActivityWithUser, RankingFilters, TotalRankingsResponse } from '@/lib/types/ranking'
import { createRankingQuery } from '@/lib/utils/ranking'
import { UsersType } from '@/lib/types/auth'

const fetchTotalRankings = async (
  filters: RankingFilters,
  user: UsersType
): Promise<TotalRankingsResponse> => {
  const supabase = createClient()
  let query = createRankingQuery(supabase, filters, user)

  // 상위 10개만 조회
  query = query.limit(10)

  const { data: activities, error } = await query

  if (error) {
    console.error(error)
    return { rankings: [] }
  }
  if (!activities || activities.length === 0) {
    return { rankings: [] }
  }

  const rankings = (activities as ActivityWithUser[]).map((activity, index) => ({
    id: activity.id,
    name: activity.name || '',
    rank: index + 1,
    distance: activity.distance || 0,
    total_elevation_gain: activity.total_elevation_gain || 0,
    date: activity.start_date || '',
    user: {
      nickname: activity.users.name || '이름 없음',
      imageUrl: activity.users.profile || undefined,
      district: activity.users.district || '지역 없음',
    },
  }))

  return {
    rankings,
  }
}

export const useTotalRankings = (filters: RankingFilters) => {
  const user = useUser()

  return useSuspenseQuery({
    queryKey: QUERY_KEYS.RANKINGS.TOTAL_RANKINGS(filters),
    queryFn: () => fetchTotalRankings(filters, user),
  })
}
