export const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
export const STRAVA_API_URL = 'https://www.strava.com/api/v3'
export const STRAVA_ATHLETE_ACTIVITIES_ENDPOINT = '/athlete/activities'
export const STRAVA_ACTIVITY_BY_ID_ENDPOINT = (id: number) => `/activities/${id}`

export const REQUIRED_SCOPES = ['read', 'profile:read_all', 'activity:read_all', 'activity:write']

export const SYNC_CONFIG = {
  FETCH_PAGE_SIZE: 200,
  BATCH_SIZE: 20,
} as const

export const STRAVA_VISIBILITY = {
  EVERYONE: 'everyone',
  FOLLOWERS_ONLY: 'followers_only',
  ONLY_ME: 'only_me',
} as const

export const STRAVA_ACTIVITY_TYPE = {
  RIDE: 'Ride',
  VIRTUAL_RIDE: 'VirtualRide',
  MOUNTAIN_BIKE_RIDE: 'MountainBikeRide',
  GRAVEL_RIDE: 'GravelRide',
} as const
