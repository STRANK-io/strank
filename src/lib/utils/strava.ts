import { Database } from '@/lib/supabase/supabase'
import { ERROR_CODES } from '@/lib/constants/error'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  STRAVA_ACTIVITY_TYPE,
  STRAVA_API_URL,
  STRAVA_ATHLETE_ACTIVITIES_ENDPOINT,
  SYNC_CONFIG,
} from '@/lib/constants/strava'
import { StravaActivity } from '@/lib/types/strava'
import { convertUTCToKoreanTime } from '@/lib/utils/date'
import { logError } from '@/lib/utils/log'
import { retryFetch } from '@/lib/utils/fetch'

type ProgressStage =
  | 'initial'
  | 'connecting'
  | 'token_refreshed'
  | 'fetching'
  | 'processing'
  | 'completed'
type ProgressState = {
  progress: number
  stage: ProgressStage
  processedItems: number
  totalItems: number | null
}

export const createProgressManager = (onProgress: (progress: number, stage: string) => void) => {
  const state: ProgressState = {
    progress: 0,
    stage: 'initial',
    processedItems: 0,
    totalItems: null,
  }

  const calculateProgress = (state: ProgressState): number => {
    switch (state.stage) {
      case 'initial':
        return 0
      case 'connecting':
        return 10
      case 'fetching':
        return 30
      case 'processing':
        if (!state.totalItems) return 40
        return Math.min(99, 40 + (state.processedItems / state.totalItems) * 59)
      case 'completed':
        return 100
      default:
        return state.progress
    }
  }

  const updateProgress = () => {
    const newProgress = calculateProgress(state)
    if (newProgress !== state.progress) {
      state.progress = newProgress
      onProgress(newProgress, state.stage)
    }
  }

  return {
    setStage: (stage: ProgressStage, total?: number) => {
      state.stage = stage
      if (total !== undefined) state.totalItems = total
      updateProgress()
    },

    addProcessedItems: (count: number) => {
      state.processedItems += count
      updateProgress()
    },

    reset: () => {
      state.progress = 0
      state.stage = 'initial'
      state.processedItems = 0
      state.totalItems = null
      updateProgress()
    },
  }
}

/**
 * 스트라바 활동 타입이 스트랭크에서 지원하는 라이딩 타입인지 확인하는 유틸리티 함수
 *
 * @param activityType - 확인할 활동 타입
 * @returns {boolean} 지원하는 타입인 경우 true, 아닌 경우 false
 */
export function isRidingActivityType(activityType: string | null | undefined): boolean {
  if (!activityType?.trim()) return false

  const normalizedType = activityType.trim().toLowerCase()
  const supportedTypes = Object.values(STRAVA_ACTIVITY_TYPE).map(type => type.toLowerCase())

  return supportedTypes.includes(normalizedType)
}

/**
 * 활동이 유효한 라이딩 데이터인지 확인하는 함수
 *
 * @param activity - 확인할 스트라바 활동 데이터
 * @returns {boolean} 유효한 라이딩 데이터인 경우 true, 아닌 경우 false
 */
export function isValidRidingActivity(activity: StravaActivity): boolean {
  // 라이딩 타입이 아닌 경우 유효하지 않음
  if (!isRidingActivityType(activity.type)) {
    return false
  }

  // 평균 속도가 50 이상인 경우 유효하지 않음 (비현실적인 속도)
  if (activity.average_speed && activity.average_speed >= 50) {
    return false
  }

  return true
}

/**
 * 스트라바 API를 통해 사용자의 활동 데이터를 조회하는 함수
 *
 * @description
 * 페이지네이션을 지원하며 설정된 페이지 크기만큼 활동 데이터를 조회합니다
 *
 * @param accessToken - 스트라바 액세스 토큰
 * @param page - 조회할 페이지 번호 (기본값: 1)
 * @param supabase - Supabase 클라이언트 인스턴스
 * @param signal - AbortController 신호 (선택 사항)
 * @returns {Promise<StravaActivity[]>} 스트라바 활동 데이터 배열
 *
 * @throws {Error} API_LIMIT_EXCEEDED - API 호출 한도 초과 시
 * @throws {Error} AUTH.STRAVA_CONNECTION_FAILED - API 연결 실패 시
 * @throws {Error} NETWORK.CONNECTION_LOST - 네트워크 연결 끊김 시
 *
 * @remarks
 * - API 호출마다 사용량을 카운트합니다
 * - Rate limit 초과 시 별도의 에러를 발생시킵니다
 * - AbortController 신호를 통해 요청을 중단할 수 있습니다
 */
export async function fetchStravaActivities(
  accessToken: string,
  page = 1,
  supabase: SupabaseClient<Database>,
  signal?: AbortSignal
): Promise<StravaActivity[]> {
  // API 사용량 증가
  const { error: usageError } = await supabase.rpc('increment_strava_api_usage', {
    is_upload: false,
  })

  if (usageError) {
    logError('Failed to increment API usage:', { error: usageError })
  }

  try {
    // Strava API 호출 (재시도 로직 적용)
    const response = await retryFetch(
      `${STRAVA_API_URL}${STRAVA_ATHLETE_ACTIVITIES_ENDPOINT}?page=${page}&per_page=${SYNC_CONFIG.FETCH_PAGE_SIZE}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
        retries: 3,
        retryDelay: 1000,
        retryStatusCodes: [408, 500, 502, 503, 504],
        onRetry: (attempt, error, response) => {
          logError('Retrying Strava API request', {
            attempt,
            error: error?.message,
            status: response?.status,
          })
        },
      }
    )

    if (!response.ok) {
      if (response.status === 429) {
        logError('Strava API limit exceeded', {
          status: response.status,
          statusText: response.statusText,
        })
        throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
      }

      if (response.status === 401) {
        logError('Strava token expired or invalid', {
          status: response.status,
          statusText: response.statusText,
        })
        throw new Error(ERROR_CODES.STRAVA.TOKEN_EXPIRED)
      }

      logError('Strava connection failed', {
        status: response.status,
        statusText: response.statusText,
      })
      throw new Error(ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED)
    }

    const data: StravaActivity[] = await response.json()

    // * 라이딩 데이터가 아니거나 평균속도가 50 이상인 경우 제외
    const ridingActivities = data.filter(activity => isValidRidingActivity(activity))

    return ridingActivities
  } catch (error) {
    if (error instanceof Error) {
      // AbortError는 요청이 의도적으로 중단된 경우
      if (error.name === 'AbortError') {
        throw new Error(ERROR_CODES.STRAVA.CONNECTION_ABORTED)
      }

      // 이미 처리된 에러는 그대로 전달
      if (
        error.message === ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED ||
        error.message === ERROR_CODES.STRAVA.TOKEN_EXPIRED ||
        error.message === ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED
      ) {
        throw error
      }

      // 네트워크 관련 에러
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error(ERROR_CODES.NETWORK.CONNECTION_LOST)
      }
    }

    // 기타 에러
    logError('Unexpected error in fetchStravaActivities:', { error })
    throw new Error(ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED)
  }
}

/**
 * 스트라바 활동 데이터를 DB에 저장하는 함수
 *
 * @description
 * 활동 데이터를 가공하여 데이터베이스에 upsert합니다
 *
 * @param activities - 저장할 활동 데이터 배열
 * @param userId - 사용자 ID
 * @param supabase - Supabase 클라이언트 인스턴스
 * @throws {Error} ACTIVITY_UPDATE_FAILED - DB 저장 실패 시
 *
 * @remarks
 * - UTC 시간을 한국 시간으로 변환하여 저장합니다
 */
export async function processActivities(
  stravaActivities: StravaActivity[],
  userId: string,
  supabase: SupabaseClient<Database>
) {
  if (stravaActivities.length === 0) return

  const { error } = await supabase.from('activities').upsert(
    stravaActivities.map(activity => ({
      id: activity.id,
      name: activity.name,
      distance: activity.distance,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      average_watts: activity.average_watts,
      max_watts: activity.max_watts,
      average_cadence: activity.average_cadence,
      max_heartrate: activity.max_heartrate,
      total_elevation_gain: activity.total_elevation_gain,
      start_date: convertUTCToKoreanTime(activity.start_date),
      visibility: activity.visibility,
      user_id: userId,
      raw_data: activity,
    }))
  )

  if (error) throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
}
