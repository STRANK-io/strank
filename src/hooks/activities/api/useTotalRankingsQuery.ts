import { useSuspenseQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { createClient } from '@/lib/supabase/client'
import { useUserContext } from '@/contexts/UserContext'
import { RankingFilters, TotalRankingsResponse } from '@/lib/types/ranking'
import { logError } from '@/lib/utils/log'

const fetchTotalRankings = async (
  filters: RankingFilters,
  userId: string
): Promise<TotalRankingsResponse> => {
  const supabase = createClient()

  console.log('Fetching rankings with filters:', {
    userId,
    filters,
  });

  const { data: activities, error } = await supabase.rpc('get_total_rankings', {
    p_user_id: userId,
    p_criteria: filters.criteria,
    p_period: filters.period,
    p_district: filters.district,
  })

  console.log('Rankings response:', { activities, error });

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
    rank: activity.result_rank,
    totalDistance: activity.result_distance || 0,
    totalElevationGain: activity.result_elevation || 0,
    user: {
      id: activity.result_user_id,
      nickname: activity.result_user_name || '이름 없음',
      imageUrl: activity.result_user_profile || undefined,
      district: activity.result_user_district || '지역 없음',
      province: activity.result_user_province || '도/시 없음',
      athleteId: activity.result_athlete_id || 0,
    },
  }))

  return { rankings }
}

export const useTotalRankingsQuery = (filters: RankingFilters) => {
  const { userId } = useUserContext()

  return useSuspenseQuery({
    queryKey: QUERY_KEYS.RANKINGS.TOTAL_RANKINGS(filters),
    queryFn: () => fetchTotalRankings(filters, userId),
  })
}
