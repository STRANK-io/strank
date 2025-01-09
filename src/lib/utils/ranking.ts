import { SupabaseClient } from '@supabase/supabase-js'
import { RankingFilters } from '@/lib/types/ranking'
import { UsersType } from '@/lib/types/auth'
import { Database } from '@/lib/supabase/supabase'

export function createRankingQuery(
  supabase: SupabaseClient<Database>,
  filters: RankingFilters,
  user: UsersType
) {
  let query = supabase
    .from('activities')
    .select(
      `
      id,
      name,
      distance,
      total_elevation_gain,
      start_date,
      users!inner (
        id,
        name,
        district,
        profile
      )
    `
    )
    .is('deleted_at', null)
    // .eq('visibility', 'followers_only') // TODO: 이거 활성화해서 배포해야함
    .is('users.deleted_at', null)
    .not('users.strava_connected_at', 'is', null)

  // criteria에 따른 필터링 및 정렬
  if (filters.criteria === 'distance') {
    query = query.not('distance', 'is', null).order('distance', { ascending: false })
  } else {
    query = query
      .not('total_elevation_gain', 'is', null)
      .order('total_elevation_gain', { ascending: false })
  }

  // 기간 필터 적용
  if (filters.period === 'lastweek') {
    const { start, end } = getLastWeekRange()
    query = query.gte('start_date', start.toISOString()).lte('start_date', end.toISOString())
  }

  // 지역 필터 적용
  if (filters.district === 'users') {
    const userDistrict = user.district
    if (userDistrict) {
      query = query.eq('users.district', userDistrict)
    }
  }

  return query
}

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
