import { create } from 'zustand'
import { RankingFilters } from '@/lib/types/ranking'
import { useUserContext } from '@/contexts/UserContext'

type FilterOption<T> = {
  left: { label: string; value: T }
  right: { label: string; value: T }
}

type FilterOptionsType = {
  criteria: FilterOption<RankingFilters['criteria']>
  district: FilterOption<RankingFilters['district']>
  period: FilterOption<RankingFilters['period']>
}

export const FILTER_OPTIONS: FilterOptionsType = {
  criteria: {
    left: { label: '고도 기준', value: 'elevation' },
    right: { label: '거리 기준', value: 'distance' },
  },
  district: {
    left: { label: '서울시', value: 'all' },
    right: { label: '지역구', value: 'users' },
  },
  period: {
    left: { label: '지난주', value: 'lastweek' },
    right: { label: '실시간', value: 'now' },
  },
}

interface RankingFiltersState {
  filters: RankingFilters
  setFilters: (type: keyof RankingFilters, position: 'left' | 'right') => void
}

export const useRankingFilters = create<RankingFiltersState>(set => ({
  filters: {
    criteria: FILTER_OPTIONS.criteria.right.value,
    district: FILTER_OPTIONS.district.right.value,
    period: FILTER_OPTIONS.period.right.value,
  },
  setFilters: (type, position) =>
    set(state => ({
      filters: {
        ...state.filters,
        [type]: FILTER_OPTIONS[type][position].value,
      },
    })),
}))
