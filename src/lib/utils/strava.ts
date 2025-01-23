import { Database } from '@/lib/supabase/supabase'
import { ERROR_CODES } from '@/lib/constants/error'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  STRAVA_API_URL,
  STRAVA_ATHLETE_ACTIVITIES_ENDPOINT,
  SYNC_CONFIG,
} from '@/lib/constants/strava'
import { StravaActivity } from '@/lib/types/strava'
import { convertUTCToKoreanTime } from '@/lib/utils/date'
import { logError } from '@/lib/utils/log'

/**
 * 스트라바 데이터 동기화 진행률을 계산하는 함수
 *
 * @description
 * 데이터 가져오기(40%)와 처리(60%)의 두 단계로 나누어 전체 진행률을 계산합니다
 *
 * @param fetchedPages - 현재까지 가져온 페이지 수
 * @param totalPages - 전체 페이지 수 (아직 알 수 없는 경우 null)
 * @param processedActivities - 처리 완료된 활동 수
 * @param totalActivities - 전체 활동 수 (아직 알 수 없는 경우 null)
 * @returns {number} 0-100 사이의 진행률 퍼센트
 */
export function calculateProgress(
  fetchedPages: number,
  totalPages: number | null,
  processedActivities: number,
  totalActivities: number | null
): number {
  if (totalPages === null) {
    // 데이터 가져오는 중일 때는 전체의 40%를 할당
    return Math.round((fetchedPages / 10) * 40) // 초기 10페이지 기준
  }

  // 데이터 가져오기: 전체의 40%
  const fetchProgress = totalPages ? Math.round((fetchedPages / totalPages) * 40) : 40

  // 데이터 처리: 전체의 60%
  const processProgress = totalActivities
    ? Math.round((processedActivities / totalActivities) * 60)
    : 0

  return Math.min(100, fetchProgress + processProgress)
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
 * @returns {Promise<StravaActivity[]>} 스트라바 활동 데이터 배열
 *
 * @throws {Error} API_LIMIT_EXCEEDED - API 호출 한도 초과 시
 * @throws {Error} AUTH.STRAVA_CONNECTION_FAILED - API 연결 실패 시
 *
 * @remarks
 * - API 호출마다 사용량을 카운트합니다
 * - Rate limit 초과 시 별도의 에러를 발생시킵니다
 */
export async function fetchStravaActivities(
  accessToken: string,
  page = 1,
  supabase: SupabaseClient<Database>
): Promise<StravaActivity[]> {
  // API 사용량 증가
  const { error: usageError } = await supabase.rpc('increment_strava_api_usage', {
    is_upload: false,
  })

  if (usageError) {
    logError('Failed to increment API usage:', { error: usageError })
  }

  // Strava API 호출
  const response = await fetch(
    `${STRAVA_API_URL}${STRAVA_ATHLETE_ACTIVITIES_ENDPOINT}?page=${page}&per_page=${SYNC_CONFIG.FETCH_PAGE_SIZE}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
    logError('Strava connection failed', {
      status: response.status,
      statusText: response.statusText,
    })
    throw new Error(ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED)
  }

  return response.json()
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
      activity_id: activity.id,
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
