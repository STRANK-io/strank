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
import { processActivities, isValidRidingActivity } from '@/lib/utils/strava'
import { refreshStravaToken } from '@/lib/utils/stravaToken'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/supabase'
import { generateActivityHash } from '@/lib/utils/activity'

/**
 * @description
 * 스트라바 활동 삭제 시 스트랭크 DB의 활동 데이터도 삭제하는 함수
 * @param body - 스트라바 웹훅 이벤트 응답 객체
 */
export async function processDeleteActivityEvent(body: StravaWebhookEventResponse) {
  const supabase = await createServiceRoleClient()

  // 1. 해당 활동이 존재하는지 확인
  const { data: activity, error: selectError } = await supabase
    .from('activities')
    .select('id')
    .eq('id', body.object_id)
    .single()

  if (selectError) {
    logError('웹훅: 삭제할 활동 조회 실패', {
      error: selectError,
      functionName: 'processDeleteActivityEvent',
      stravaActivityId: body.object_id,
    })
    return
  }

  // 이미 삭제되었거나 존재하지 않는 활동인 경우
  if (!activity) {
    logError('웹훅: 삭제할 활동을 찾을 수 없음', {
      functionName: 'processDeleteActivityEvent',
      stravaActivityId: body.object_id,
    })
    return
  }

  // 2. 활동 삭제
  const { error: deleteError } = await supabase.from('activities').delete().eq('id', body.object_id)

  if (deleteError) {
    logError('웹훅: 스트라바에서 삭제한 활동 데이터 삭제 실패', {
      error: deleteError,
      functionName: 'processDeleteActivityEvent',
      stravaActivityId: body.object_id,
    })
  }
}

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
export async function processCreateActivityEvent(body: StravaWebhookEventResponse) {
  try {
    const supabase = await createServiceRoleClient()

    // * 유저의 스트라바 엑세스 토큰 조회
    const { data: tokenData, error: tokenError } = await supabase
      .from('strava_user_tokens')
      .select('access_token, refresh_token, expires_at, user_id')
      .eq('strava_athlete_id', body.owner_id)
      .is('deleted_at', null)
      .maybeSingle()

    if (tokenError) {
      logError('Strava Webhook: strava_user_tokens 조회 중 에러 발생', {
        error: tokenError,
        owner_id: body.owner_id,
      })
      return
    }

    if (!tokenData) {
      logError('Strava Webhook: strava_user_tokens table에서 데이터를 찾을 수 없습니다.', {
        owner_id: body.owner_id,
        query: {
          table: 'strava_user_tokens',
          column: 'strava_athlete_id',
          value: body.owner_id,
        },
      })
      return
    }

    const { user_id } = tokenData

    // * 엑세스 토큰 만료 확인 및 만료 시 갱신
    let accessToken
    try {
      const tokenResult = await refreshStravaToken(user_id)
      accessToken = tokenResult.accessToken
    } catch (error) {
      logError('Strava Webhook: 토큰 갱신 중 오류 발생', {
        error,
        userId: user_id,
        stravaAthleteId: body.owner_id,
      })
      return
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

    // * 유효한 라이딩 활동인지 확인
    if (!isValidRidingActivity(activity)) {
      return
    }

    // * 활동 해시 생성
    const activityHash = generateActivityHash(
      user_id,
      activity.distance || 0,
      activity.total_elevation_gain || 0,
      activity.start_date
    )

    // * 중복 활동 체크 (삭제되지 않은 활동만)
    const { data: existingActivity } = await supabase
      .from('activities')
      .select('id')
      .eq('activity_hash', activityHash)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingActivity) {
      // 해시값이 같은데 ID가 다른 경우 기존 활동 삭제 (최신 활동을 저장하기 위함)
      if (existingActivity.id !== activity.id) {
        await supabase.from('activities').delete().eq('id', existingActivity.id)
      } else {
        // 해시값도 같고 ID도 같으면 기존 활동 유지
        return
      }
    }

    // * 활동 데이터 DB에 저장 (activity_hash 포함)
    await processActivities([{ ...activity, activity_hash: activityHash }], user_id, supabase)

    // DB에 데이터가 완전히 저장될 때까지 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 1000))

    let rankingsWithDistrict: CalculateActivityRankingReturn | null = null

    const isEveryone = activity.visibility === STRAVA_VISIBILITY.EVERYONE
    // * 랭킹 정보 계산
    // activity.visibility가 everyone이 아닌 경우는 랭킹 데이터 계산 생략 및 디스크립션에 넣지 않음
    if (isEveryone) {
      console.log('🔍 랭킹 계산 전 활동 확인:', {
        activityId: activity.id,
        distance: activity.distance,
        elevation: activity.total_elevation_gain,
        visibility: activity.visibility,
        time: new Date().toISOString()
      })
      rankingsWithDistrict = await calculateActivityRanking(activity, user_id, supabase)
    }

    // * 디스크립션 생성
    const description = await generateActivityDescription(activity, rankingsWithDistrict)

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

  console.log('🎯 랭킹 계산 시작:', {
    activityId: stravaActivity.id,
    district: user.district,
    time: new Date().toISOString()
  })

  // 이번 주 활동 통계 조회
  const { data: weeklyStats, error: statsError } = await supabase
    .from('activities')
    .select('distance, total_elevation_gain')
    .eq('user_id', userId)
    .eq('visibility', 'everyone')
    .is('deleted_at', null)
    .gte('start_date', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString());

  console.log('📊 이번 주 활동 통계:', {
    weeklyStats,
    totalDistance: weeklyStats?.reduce((sum, act) => sum + (act.distance || 0), 0),
    totalElevation: weeklyStats?.reduce((sum, act) => sum + (act.total_elevation_gain || 0), 0),
    time: new Date().toISOString()
  });

  const { data: rankings, error } = await supabase.rpc('get_activity_rankings', {
    p_activity_id: stravaActivity.id,
    p_user_district: user.district,
  })

  console.log('📊 get_activity_rankings 결과:', {
    rankings,
    error,
    time: new Date().toISOString()
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

  console.log('🏆 최종 랭킹 데이터:', {
    ranking,
    time: new Date().toISOString()
  })

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

/**
 * 스트라바 활동 수정 이벤트를 처리하는 함수
 *
 * @description
 * 다음과 같은 순차적인 작업을 수행합니다:
 * 1. 스트라바 액세스 토큰 조회 및 필요시 갱신
 * 2. 스트라바 API를 통한 활동 상세 정보 조회
 * 3. 활동 name에 strank, STRANK, rank, RANK, 랭크, 랭킹, 순위 키워드가 있는지 확인
 * 4. 키워드가 있고 디스크립션에 STRANK가 없으면 디스크립션 생성 및 업데이트
 *
 * @param body - 스트라바 웹훅 이벤트 응답 객체
 */
export async function processUpdateActivityEvent(body: StravaWebhookEventResponse) {
  try {
    const supabase = await createServiceRoleClient()

    // * 유저의 스트라바 엑세스 토큰 조회
    const { data: tokenData, error: tokenError } = await supabase
      .from('strava_user_tokens')
      .select('user_id')
      .eq('strava_athlete_id', body.owner_id)
      .is('deleted_at', null)
      .maybeSingle()

    if (tokenError || !tokenData) {
      logError('Strava Webhook Update: 토큰 조회 실패', {
        error: tokenError,
        owner_id: body.owner_id,
      })
      return
    }

    const { user_id } = tokenData

    // * 엑세스 토큰 갱신 및 조회
    let accessToken
    try {
      const tokenResult = await refreshStravaToken(user_id)
      accessToken = tokenResult.accessToken

      // accessToken이 없는 경우
      if (!accessToken) {
        logError('Strava Webhook Update: 토큰 갱신 실패', {
          userId: user_id,
        })
        return
      }
    } catch (error) {
      logError('Strava Webhook Update: 토큰 갱신 중 오류 발생', {
        error,
        userId: user_id,
      })
      return
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
    await supabase.rpc('increment_strava_api_usage', {
      is_upload: false,
    })

    if (!response.ok) {
      logError('Strava Webhook Update: 활동 조회 실패', {
        status: response.status,
        error: await response.text(),
      })
      return
    }

    const activity: StravaActivity = await response.json()

    // * 유효한 라이딩 활동인지 확인
    if (!isValidRidingActivity(activity)) {
      return
    }

    // * 활동 해시 생성
    const activityHash = generateActivityHash(
      user_id,
      activity.distance || 0,
      activity.total_elevation_gain || 0,
      activity.start_date
    )

    // * 중복 활동 체크
    const { data: existingActivity } = await supabase
      .from('activities')
      .select('id')
      .eq('activity_hash', activityHash)
      .maybeSingle()

    if (existingActivity) {
      // 해시값이 같은데 ID가 다른 경우 기존 활동 삭제
      if (existingActivity.id !== activity.id) {
        await supabase.from('activities').delete().eq('id', existingActivity.id)
      }
    }

    // * 활동 데이터 DB에 저장/업데이트
    await processActivities([{ ...activity, activity_hash: activityHash }], user_id, supabase)

    // * 활동 이름에 키워드가 포함되어 있는지 확인
    const keywords = ['strank', 'STRANK', 'rank', 'RANK', '랭크', '랭킹', '순위']
    const hasKeyword = keywords.some(keyword => activity.name?.includes(keyword))

    if (!hasKeyword || activity.description?.includes('STRANK')) {
      return // 키워드가 없거나 이미 STRANK 디스크립션이 있으면 종료
    }

    // * 랭킹 정보 계산
    const isEveryone = activity.visibility === STRAVA_VISIBILITY.EVERYONE
    let rankingsWithDistrict: CalculateActivityRankingReturn | null = null

    if (isEveryone) {
      rankingsWithDistrict = await calculateActivityRanking(activity, user_id, supabase)
    }

    // * 디스크립션 생성
    const strankDescription = await generateActivityDescription(activity, rankingsWithDistrict)

    // * 스트라바 활동 업데이트
    await updateStravaActivityDescription(accessToken, activity, strankDescription)

    // * API 사용량 증가
    await supabase.rpc('increment_strava_api_usage', {
      is_upload: false,
    })
  } catch (error) {
    logError('Strava Webhook Update: 처리 중 오류 발생', { error })
  }
}
