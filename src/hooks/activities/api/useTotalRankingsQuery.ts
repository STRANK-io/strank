import { useSuspenseQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { createClient } from '@/lib/supabase/client'
import { useUserId } from '@/contexts/UserContext'
import { RankingFilters, TotalRankingsResponse } from '@/lib/types/ranking'
import { logError } from '@/lib/utils/log'

const fetchTotalRankings = async (
  filters: RankingFilters,
  userId: string
): Promise<TotalRankingsResponse> => {
  const supabase = createClient()

  const { data: activities, error } = await supabase.rpc('get_total_rankings', {
    p_user_id: userId,
    p_criteria: filters.criteria,
    p_period: filters.period,
    p_district: filters.district,
  })

  if (error) {
    logError('Error fetching total rankings:', {
      error,
      functionName: 'fetchTotalRankings',
    })
    return { rankings: [] }
  }

  if (!activities || activities.length === 0) {
    return { rankings: [] }
  }

  const rankings = activities.map(activity => ({
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
  }))

  return { rankings }
}

export const useTotalRankingsQuery = (filters: RankingFilters) => {
  const userId = useUserId()

  return useSuspenseQuery({
    queryKey: QUERY_KEYS.RANKINGS.TOTAL_RANKINGS(filters),
    queryFn: () => fetchTotalRankings(filters, userId),
  })
}
