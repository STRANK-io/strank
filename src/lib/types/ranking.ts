export type RankingFilters = {
  criteria: 'distance' | 'elevation'
  district: 'all' | 'users'
  period: 'lastweek' | 'now'
}

// DB 응답 타입
export interface ActivityWithUser {
  id: string
  name: string | null
  distance: number | null
  total_elevation_gain: number | null
  start_date: string
  users: {
    id: string
    name: string | null
    district: string | null
    profile: string | null
  }
}

// 프론트엔드에서 사용할 타입
export type ActivityWithRanking = {
  id: string
  name: string
  rank: number
  distance: number
  elevation: number
  date: string
  user: {
    nickname: string
    imageUrl?: string
    district: string
  }
}

export type MyRankingResponse = ActivityWithRanking

export type TotalRankingsResponse = {
  rankings: ActivityWithRanking[]
}
