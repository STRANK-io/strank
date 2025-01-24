import { ERROR_CODES } from '@/lib/constants/error'
import {
  STRAVA_ACTIVITY_BY_ID_ENDPOINT,
  STRAVA_API_URL,
  STRAVA_VISIBILITY,
} from '@/lib/constants/strava'
import { StravaActivity, StravaWebhookEventResponse } from '@/lib/types/strava'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import {
  generateActivityDescription,
  updateStravaActivityDescription,
} from '@/lib/utils/description'
import { logError } from '@/lib/utils/log'
import { processActivities } from '@/lib/utils/strava'
import { isTokenExpiringSoon, refreshStravaTokenAndUpdate } from '@/lib/utils/stravaToken'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/supabase'

/**
 * 스트라바 웹훅 이벤트를 처리하는 백그라운드 작업을 수행하는 함수
 *
 * @description
 * 다음과 같은 순차적인 작업을 수행합니다:
 * 1. 스트라바 액세스 토큰 조회 및 필요시 갱신
 * 2. 스트라바 API를 통한 활동 상세 정보 조회
 * 3. 활동 데이터를 데이터베이스에 저장
 * 4. 활동이 visibility:everyone인 경우 랭킹 정보 계산
 * 5. 활동 디스크립션 생성 및 스트라바 활동 데이터 업데이트(PUT) 처리
 *
 * @param body - 스트라바 웹훅 이벤트 응답 객체
 *
 * @remarks
 * - 액세스 토큰이 만료 예정인 경우 자동으로 갱신합니다
 * - API 사용량을 추적하기 위해 호출 횟수를 카운트합니다
 * - 활동의 공개 범위가 'everyone'이 아닌 경우 랭킹 계산을 생략합니다
 */
export async function processWebhookEvent(body: StravaWebhookEventResponse) {
  try {
    const supabase = await createServiceRoleClient()

    // * 유저의 스트라바 엑세스 토큰 조회
    const { data: tokenData } = await supabase
      .from('strava_user_tokens')
      .select('access_token, refresh_token, expires_at, user_id')
      .eq('strava_athlete_id', body.owner_id)
      .maybeSingle()

    if (!tokenData) {
      logError('Strava Webhook: strava_user_tokens table에서 데이터를 찾을 수 없습니다.', {
        owner_id: body.owner_id,
      })
      return
    }

    const { access_token, refresh_token, expires_at, user_id } = tokenData

    // * 엑세스 토큰 만료 확인 및 만료 시 갱신
    let accessToken = access_token

    if (isTokenExpiringSoon(expires_at)) {
      accessToken = await refreshStravaTokenAndUpdate(supabase, user_id, refresh_token)
    }

    // * 활동 상세 정보 조회
    const response = await fetch(
      `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(body.object_id)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    // * 스트라바 API 호출 카운트 추가
    const { error: incrementGetAPIUsageError } = await supabase.rpc('increment_strava_api_usage', {
      is_upload: false,
    })

    if (incrementGetAPIUsageError) {
      logError('Strava Webhook: Failed to increment API usage:', {
        error: incrementGetAPIUsageError,
      })
    }

    if (!response.ok) {
      if (response.status === 429) {
        logError('Strava Webhook: API rate limit exceeded')
        return
      }
      logError('Strava Webhook: Failed to fetch activity:', { error: await response.text() })
      return
    }

    const activity: StravaActivity = await response.json()

    // * 활동 데이터 DB에 저장
    await processActivities([activity], user_id, supabase)

    let rankingsWithDistrict: CalculateActivityRankingReturn | null = null

    // * 랭킹 정보 계산
    // * activity.visibility가 everyone이 아닌 경우는 랭킹 데이터 계산 생략 및 디스크립션에 넣지 않음
    if (activity.visibility === STRAVA_VISIBILITY.EVERYONE) {
      rankingsWithDistrict = await calculateActivityRanking(activity, user_id, supabase)
    }

    // * 디스크립션 생성
    const description = generateActivityDescription(activity, rankingsWithDistrict)

    // * 스트라바 활동 업데이트
    await updateStravaActivityDescription(accessToken, activity, description)

    // * 스트라바 API 호출 카운트 추가 (PUT 요청도 non_upload 요청에 포함됨 - 스트라바 정책)
    const { error: incrementPutAPIUsageError } = await supabase.rpc('increment_strava_api_usage', {
      is_upload: false,
    })

    if (incrementPutAPIUsageError) {
      logError('Strava Webhook: Failed to increment API usage:', incrementPutAPIUsageError)
    }
  } catch (error) {
    logError('Background webhook processing error:', { error })
    throw Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
  }
}

/**
 * 스트라바 활동에 대한 랭킹을 계산하는 함수 (웹훅 이벤트 발생 후 디스크립션 생성 시 표기될 랭킹)
 *
 * @description
 * 사용자의 활동에 대해 서울시/유저의 거주 지역 단위의 거리 및 고도 랭킹을 계산합니다
 *
 * @param activity - 랭킹을 계산할 스트라바 활동 정보
 * @param userId - 사용자 ID
 * @param supabase - Supabase 클라이언트 인스턴스
 * @returns {Promise<CalculateActivityRankingReturn | null>} 계산된 랭킹 정보 또는 실패 시 null
 *
 * @remarks
 * - usre 데이터가 없거나 지역 정보가 없는 경우 null 반환
 * - 시/구 단위의 거리 및 고도 랭킹을 모두 포함
 * - 랭킹 계산에 실패한 경우 에러 로깅 후 null 반환
 */
export async function calculateActivityRanking(
  stravaActivity: StravaActivity,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<CalculateActivityRankingReturn | null> {
  const { data: user } = await supabase
    .from('users')
    .select('id, name, district, profile')
    .eq('id', userId)
    .single()

  if (!user || !user.district) {
    logError(`calculateActivityRanking Error: 'User profile not found`, {
      userId: user?.id,
      activityId: stravaActivity.id,
    })
    return null
  }

  const { data: rankings, error } = await supabase.rpc('get_activity_rankings', {
    p_activity_id: stravaActivity.id,
    p_user_district: user.district,
  })

  if (error) {
    logError('calculateActivityRanking Error: Failed to get_activity_rankings', {
      userId: user?.id,
      activityId: stravaActivity.id,
      error,
    })
    return null
  }

  const ranking = rankings[0]

  return {
    rankings: {
      distanceRankCity: ranking.city_distance_rank || null,
      distanceRankDistrict: ranking.district_distance_rank || null,
      elevationRankCity: ranking.city_elevation_rank || null,
      elevationRankDistrict: ranking.district_elevation_rank || null,
    },
    district: user.district,
  }
}
