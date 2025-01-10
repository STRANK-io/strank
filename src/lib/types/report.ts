import { Database } from '@/lib/supabase/supabase'

export type DateRange = '3months' | '1month' | '1week'
export type ActiveCriteriaType = 'distance' | 'elevation' | 'speed' | 'power'

export interface ReportFilter {
  dateRange: DateRange
  activeCriteria: ActiveCriteriaType[]
}

export type ActivityData = Pick<
  Database['public']['Tables']['activities']['Row'],
  'id' | 'distance' | 'total_elevation_gain' | 'average_speed' | 'average_watts'
> & { date: string }

export interface ReportResponse {
  activities: ActivityData[]
}
