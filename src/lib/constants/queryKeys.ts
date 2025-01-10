import { RankingFilters } from '@/lib/types/ranking'
import { DateRange } from '@/lib/types/report'

export const QUERY_KEYS = {
  USER: {
    INFO: (userId: string) => ['user', 'info', userId] as const,
  },
  RANKINGS: {
    MY_RANKING: (filters: RankingFilters) => ['rankings', 'my', filters] as const,
    TOTAL_RANKINGS: (filters: RankingFilters) => ['rankings', 'total', filters] as const,
  },
  REPORT: {
    ACTIVITIES: (dateRange: DateRange) => ['report', 'activities', dateRange] as const,
  },
} as const
