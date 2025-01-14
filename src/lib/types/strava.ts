import { STRAVA_VISIBILITY } from '@/lib/constants/strava'

export interface StravaSubscriptionValidationResponse {
  'hub.mode': string
  'hub.verify_token': string // 구독 생성시 우리가 설정한 토큰
  'hub.challenge': string // 구독 검증을 위해 필요한 값
}

export interface StravaWebhookEventResponse {
  object_type: 'activity' | 'athlete'
  object_id: number // activity id
  aspect_type: 'create' | 'update' | 'delete'
  owner_id: number // user id
  subscription_id: number // 구독 id
  event_time: number // 이벤트 발생 시간
  updates: {
    title?: string
    type?: string
    private?: boolean
  }
}

export interface StravaTokenResponse {
  token_type: string
  expires_at: number
  expires_in: number
  refresh_token: string
  access_token: string
  athlete: {
    id: number // 스트라바 유저 id
    username: string
    profile: string
  }
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
