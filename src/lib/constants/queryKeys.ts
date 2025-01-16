import { RankingFilters } from '@/lib/types/ranking'
import { DateRange } from '@/lib/types/report'

export const QUERY_KEYS = {
  USER: {
    INFO: (userId: string) => ['user', 'info', userId] as const,
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
} as const
