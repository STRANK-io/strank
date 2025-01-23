import { Database } from '@/lib/supabase/supabase'

export type RankingFilters = {
  criteria: 'distance' | 'elevation'
  district: 'all' | 'users'
  period: 'lastweek' | 'now'
}

// DB 응답 타입
export type ActivityWithUser = Pick<
  Database['public']['Tables']['activities']['Row'],
  'id' | 'name' | 'distance' | 'total_elevation_gain' | 'start_date'
> & {
  users: Pick<Database['public']['Tables']['users']['Row'], 'id' | 'name' | 'district' | 'profile'>
}

// 프론트엔드에서 사용할 타입
export type ActivityWithRanking = {
  rank: number
  totalDistance: number
  totalElevationGain: number
  user: { id: string; nickname: string; imageUrl?: string; district: string; athleteId: number }
}

export type MyRankingResponse = ActivityWithRanking

export type TotalRankingsResponse = {
  rankings: ActivityWithRanking[]
}

export interface GetActivityRankingsResponse {
  distanceRankCity: number | null
  distanceRankDistrict: number | null
  elevationRankCity: number | null
  elevationRankDistrict: number | null
}

export interface CalculateActivityRankingReturn {
  rankings: GetActivityRankingsResponse | null
  district: string
}
