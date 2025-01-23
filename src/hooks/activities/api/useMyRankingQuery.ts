import { useSuspenseQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { createClient } from '@/lib/supabase/client'
import { useUserContext } from '@/contexts/UserContext'
import { MyRankingResponse, RankingFilters } from '@/lib/types/ranking'
import { logError } from '@/lib/utils/log'

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
    logError('Error fetching my ranking:', {
      error,
      functionName: 'fetchMyRanking',
    })
    return null
  }

  if (!result || result.length === 0) return null

  const activity = result[0]
  return {
    rank: activity.result_rank,
    totalDistance: activity.result_distance || 0,
    totalElevationGain: activity.result_elevation || 0,
    user: {
      id: activity.result_user_id,
      nickname: activity.result_user_name || '이름 없음',
      imageUrl: activity.result_user_profile || undefined,
      district: activity.result_user_district || '지역 없음',
      athleteId: activity.result_athlete_id || 0,
    },
  }
}

export const useMyRankingQuery = (filters: RankingFilters) => {
  const { userId } = useUserContext()

  return useSuspenseQuery({
    queryKey: QUERY_KEYS.RANKINGS.MY_RANKING(filters),
    queryFn: () => fetchMyRanking(filters, userId),
  })
}
