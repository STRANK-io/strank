export interface TimelineActivity {
  id: string
  name: string | null
  start_date: string | null
  distance: number | null
  total_elevation_gain: number | null
  max_heartrate: number | null
  average_cadence: number | null
  average_speed: number | null
  max_speed: number | null
  average_watts: number | null
  max_watts: number | null
}

export interface TimelineResponse {
  activities: TimelineActivity[]
  nextCursor: string | null
}
