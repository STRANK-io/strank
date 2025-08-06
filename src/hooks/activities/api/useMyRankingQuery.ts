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
  console.log('🚀 fetchMyRanking 시작:', { filters, userId, time: new Date().toISOString() })
  
  const supabase = createClient()

  const { data: result, error } = await supabase.rpc('get_my_best_ranking', {
    p_user_id: userId,
    p_criteria: filters.criteria,
    p_period: filters.period,
    p_district: filters.district,
  })

  console.log('🎯 fetchMyRanking RPC 결과:', { result, error, userId })

  if (error) {
    console.error('🚨 Supabase RPC 에러 상세:', {
      error,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      functionName: 'fetchMyRanking',
    })
    logError('Error fetching my ranking:', {
      error,
      functionName: 'fetchMyRanking',
    })
    return null
  }

  if (!result || result.length === 0) return null

  const activity = result[0]
  
  // 디버깅: province 데이터 확인
  console.log('🔍 MyRanking 데이터 확인:', {
    result_user_province: activity.result_user_province,
    full_activity: activity,
    time: new Date().toISOString()
  })

  return {
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
  }
}

export const useMyRankingQuery = (filters: RankingFilters) => {
  const { userId } = useUserContext()

  return useSuspenseQuery({
    queryKey: QUERY_KEYS.RANKINGS.MY_RANKING(filters),
    queryFn: () => fetchMyRanking(filters, userId),
  })
}
