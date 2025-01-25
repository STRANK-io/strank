import { Database } from '@/lib/supabase/supabase'

export type TimelineActivity = Pick<
  Database['public']['Tables']['activities']['Row'],
  | 'id'
  | 'name'
  | 'start_date'
  | 'distance'
  | 'total_elevation_gain'
  | 'max_heartrate'
  | 'average_cadence'
  | 'average_speed'
  | 'max_speed'
  | 'average_watts'
  | 'max_watts'
>

export interface TimelineResponse {
  activities: TimelineActivity[]
  nextCursor: string | null
}
