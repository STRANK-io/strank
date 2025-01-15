import { Database } from '@/lib/supabase/supabase'
import { ERROR_CODES } from '@/lib/constants/error'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  STRAVA_ACTIVITY_BY_ID_ENDPOINT,
  STRAVA_API_URL,
  STRAVA_ATHLETE_ACTIVITIES_ENDPOINT,
  SYNC_CONFIG,
} from '@/lib/constants/strava'
import { StravaActivity } from '@/lib/types/strava'
import { convertUTCToKoreanTime } from '@/lib/utils/date'

// 진행률 계산 헬퍼 함수
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
    console.error('Failed to increment API usage:', usageError)
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
      console.error('Strava API limit exceeded')
      throw new Error(ERROR_CODES.STRAVA_API_LIMIT_EXCEEDED)
    }
    console.error('Strava connection failed')
    throw new Error(ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED)
  }

  return response.json()
}

export async function processActivities(
  activities: StravaActivity[],
  userId: string,
  supabase: SupabaseClient<Database>
) {
  if (activities.length === 0) return

  const { error } = await supabase.from('activities').upsert(
    activities.map(activity => ({
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

  if (error) throw new Error(ERROR_CODES.STRAVA_ACTIVITY_UPDATE_FAILED)
}

export async function updateStravaActivityDescription(
  accessToken: string,
  activity: StravaActivity,
  newDescription: string
): Promise<void> {
  // 기존 설명과 새로운 설명을 결합
  const combinedDescription = activity.description
    ? `${activity.description}\n\n${newDescription}`
    : newDescription

  // 업데이트된 설명으로 활동 정보 업데이트
  const updateResponse = await fetch(
    `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(activity.id)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: combinedDescription,
      }),
    }
  )

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()

    if (updateResponse.status === 429) {
      console.error('Strava API: Rate limit exceeded when updating activity description')
      throw new Error(ERROR_CODES.STRAVA_API_LIMIT_EXCEEDED)
    }

    console.error('Strava API: Failed to update activity description:', errorText)
    throw new Error(ERROR_CODES.STRAVA_ACTIVITY_UPDATE_FAILED)
  }
}
