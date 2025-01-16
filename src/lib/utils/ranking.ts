import { SupabaseClient } from '@supabase/supabase-js'
import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { Database } from '@/lib/supabase/supabase'
import { StravaActivity } from '@/lib/types/strava'
import { logError } from '@/lib/utils/log'

export function getLastWeekRange() {
  // 현재 시간을 KST로 구하기
  const now = new Date()
  const kstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))

  // 지난주 월요일 구하기
  const lastMonday = new Date(kstNow)
  lastMonday.setDate(kstNow.getDate() - (kstNow.getDay() || 7) - 6)
  lastMonday.setHours(0, 0, 0, 0)

  // 지난주 일요일 구하기
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 6)
  lastSunday.setHours(23, 59, 59, 999)

  return {
    start: lastMonday,
    end: lastSunday,
  }
}

export async function calculateActivityRanking(
  activity: StravaActivity,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<CalculateActivityRankingReturn | null> {
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, name, district, profile')
    .eq('id', userId)
    .single()

  if (!userProfile || !userProfile.district) {
    logError(`calculateActivityRanking Error: 'User profile not found`, {
      userId: userProfile?.id,
      activityId: activity.id,
    })
    return null
  }

  const { data: rankings, error } = await supabase.rpc('get_activity_rankings', {
    activity_id: activity.id,
    user_district: userProfile.district,
  })

  if (error) {
    logError('calculateActivityRanking Error: Failed to get_activity_rankings', {
      userId: userProfile?.id,
      activityId: activity.id,
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
    district: userProfile.district,
  }
}
