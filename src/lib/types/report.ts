export type DateRange = '3months' | '1month' | '1week'
export type ActiveCriteriaType = 'distance' | 'elevation' | 'speed' | 'power'

export interface ReportFilter {
  dateRange: DateRange
  activeCriteria: ActiveCriteriaType[]
}

export interface ActivityData {
  id: string
  date: string
  distance: number
  elevation: number
  average_speed: number
  average_watts: number
}

export interface ReportResponse {
  activities: ActivityData[]
}
