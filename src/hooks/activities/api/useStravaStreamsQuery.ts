import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { StravaStreamsResponse } from '@/lib/types/strava'
import { useUserContext } from '@/contexts/UserContext'
import { logError } from '@/lib/utils/log'

/**
 * 스트라바 액티비티의 스트림 데이터를 가져오는 React Query 훅
 * 
 * @param activityId - 스트라바 액티비티 ID
 * @param keys - 가져올 스트림 데이터 키들 (기본값: distance,time,latlng,altitude,velocity_smooth,heartrate,cadence,watts,grade_smooth)
 * @param enabled - 쿼리 활성화 여부 (기본값: true)
 * @returns {UseQueryResult<StravaStreamsResponse>} 스트림 데이터 쿼리 결과
 */
export const useStravaStreamsQuery = (
  activityId: number,
  keys: string[] = ['distance', 'time', 'latlng', 'altitude', 'velocity_smooth', 'heartrate', 'cadence', 'watts', 'grade_smooth'],
  enabled: boolean = true
) => {
  const { userId } = useUserContext()
  
  // 사용자 ID가 없으면 쿼리 비활성화
  const isEnabled = enabled && !!userId && !!activityId

  return useQuery({
    queryKey: QUERY_KEYS.STRAVA.STREAMS(activityId, keys),
    queryFn: async (): Promise<StravaStreamsResponse> => {
      if (!userId) {
        throw new Error('사용자 ID가 없습니다.')
      }

      console.log(`[스트림 훅] 액티비티 ${activityId}의 스트림 데이터 요청 시작`)
      
      try {
        // API 엔드포인트를 통해 스트림 데이터 요청
        const keysParam = keys.join(',')
        const response = await fetch(`/api/strava/streams?activityId=${activityId}&keys=${keysParam}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP 오류: ${response.status}`)
        }
        
        const result = await response.json()
        const streamsData: StravaStreamsResponse = result.data
        
        console.log(`[스트림 훅] 액티비티 ${activityId}의 스트림 데이터 성공적으로 가져옴`)
        return streamsData
      } catch (error) {
        console.error(`[스트림 훅] 액티비티 ${activityId}의 스트림 데이터 요청 실패:`, error)
        logError('Error in useStravaStreamsQuery:', {
          error,
          activityId,
          functionName: 'useStravaStreamsQuery',
        })
        throw error
      }
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5분간 데이터를 신선하게 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시에 보관
    retry: (failureCount, error) => {
      // 네트워크 오류나 5xx 서버 오류인 경우에만 재시도
      if (failureCount >= 3) return false
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isRetryableError = errorMessage.includes('500') || 
                              errorMessage.includes('502') || 
                              errorMessage.includes('503') || 
                              errorMessage.includes('504') ||
                              errorMessage.includes('네트워크')
      
      console.log(`[스트림 훅] 재시도 ${failureCount + 1}/3, 오류: ${errorMessage}, 재시도 가능: ${isRetryableError}`)
      return isRetryableError
    },
  })
}
