import { useSuspenseQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { createClient } from '@/lib/supabase/client'
import { useUserId } from '@/contexts/UserContext'
import { MyRankingResponse, RankingFilters } from '@/lib/types/ranking'

const fetchMyRanking = async (
  filters: RankingFilters,
  userId: string
): Promise<MyRankingResponse | null> => {
  const supabase = createClient()

  const { data: result, error } = await supabase.rpc('get_my_best_ranking', {
    p_user_id: userId,
    p_criteria: filters.criteria,
    p_period: filters.period,
    p_district: filters.district,
  })

  if (error) {
    console.error(error)
    return null
  }

  if (!result || result.length === 0) return null

  const activity = result[0]
  return {
    id: activity.result_activity_id,
    name: activity.result_activity_name || '',
    rank: activity.result_rank,
    distance: activity.result_distance || 0,
    total_elevation_gain: activity.result_elevation || 0,
    date: activity.result_start_date || '',
    user: {
      nickname: activity.result_user_name || '이름 없음',
      imageUrl: activity.result_user_profile || undefined,
      district: activity.result_user_district || '지역 없음',
    },
  }
}

export const useMyRankingQuery = (filters: RankingFilters) => {
  const userId = useUserId()

  return useSuspenseQuery({
    queryKey: QUERY_KEYS.RANKINGS.MY_RANKING(filters),
    queryFn: () => fetchMyRanking(filters, userId),
  })
}
