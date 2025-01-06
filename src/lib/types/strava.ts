import { STRAVA_VISIBILITY } from '@/lib/constants/strava'

export interface StravaTokenResponse {
  token_type: string
  expires_at: number
  expires_in: number
  refresh_token: string
  access_token: string
  athlete: Record<string, unknown>
}

export interface StravaActivity {
  id: number
  name: string
  distance: number
  average_speed: number
  max_speed: number
  average_watts: number | null
  max_watts: number | null
  average_cadence: number | null
  max_heartrate: number | null
  total_elevation_gain: number
  start_date: string
  visibility: StravaVisibility
  [key: string]: any
}

export type StravaVisibility = (typeof STRAVA_VISIBILITY)[keyof typeof STRAVA_VISIBILITY]
