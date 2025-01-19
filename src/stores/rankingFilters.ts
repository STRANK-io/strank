import { create } from 'zustand'
import { RankingFilters } from '@/lib/types/ranking'

interface RankingFiltersState {
  filters: RankingFilters
  setFilters: (type: keyof RankingFilters, value: 'left' | 'right') => void
}

const getFilterValue = (type: keyof RankingFilters, value: 'left' | 'right'): string => {
  const values = {
    criteria: value === 'left' ? 'distance' : 'elevation',
    district: value === 'left' ? 'all' : 'users',
    period: value === 'left' ? 'lastweek' : 'now',
  }
  return values[type]
}

export const useRankingFilters = create<RankingFiltersState>(set => ({
  filters: {
    criteria: 'elevation',
    district: 'users',
    period: 'now',
  },
  setFilters: (type, value) =>
    set(state => ({
      filters: {
        ...state.filters,
        [type]: getFilterValue(type, value),
      },
    })),
}))
