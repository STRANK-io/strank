import { RankingFilters } from '@/lib/types/ranking'
import { DateRange } from '@/lib/types/report'

export const QUERY_KEYS = {
  USER: {
    DEFAULT: ['user'] as const,
    INFO: (userId: string) => [...QUERY_KEYS.USER.DEFAULT, 'info', userId] as const,
    CHECK_NICKNAME: (nickname: string) =>
      [...QUERY_KEYS.USER.DEFAULT, 'check-nickname', nickname] as const,
  },
  RANKINGS: {
    DEFAULT: ['rankings'] as const,
    MY_RANKING: (filters: RankingFilters) =>
      [...QUERY_KEYS.RANKINGS.DEFAULT, 'my', filters] as const,
    TOTAL_RANKINGS: (filters: RankingFilters) =>
      [...QUERY_KEYS.RANKINGS.DEFAULT, 'total', filters] as const,
  },
  REPORT: {
    DEFAULT: ['report'] as const,
    ACTIVITIES: (dateRange: DateRange) =>
      [...QUERY_KEYS.REPORT.DEFAULT, 'activities', dateRange] as const,
  },
  TIMELINE: {
    DEFAULT: ['timeline'] as const,
    ACTIVITIES: () => [...QUERY_KEYS.TIMELINE.DEFAULT, 'activities'] as const,
  },
  STRAVA: {
    DEFAULT: ['strava'] as const,
    STREAMS: (activityId: number, keys: string[]) =>
      [...QUERY_KEYS.STRAVA.DEFAULT, 'streams', activityId, keys] as const,
  },
  ZONE: {
    INFO: (userId: string, zoneType: string) => ['zone', 'info', userId, zoneType],
  },
} as const
