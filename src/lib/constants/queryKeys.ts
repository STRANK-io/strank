import { RankingFilters } from '@/lib/types/ranking'

export const QUERY_KEYS = {
  USER: {
    INFO: (userId: string) => ['user', 'info', userId] as const,
  },
  RANKINGS: {
    MY_RANKING: (filters: RankingFilters) => ['rankings', 'my', filters] as const,
    TOTAL_RANKINGS: (filters: RankingFilters) => ['rankings', 'total', filters] as const,
  },
} as const
