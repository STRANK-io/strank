export const STRAVA_API_URL = 'https://www.strava.com/api/v3'
export const STRAVA_ATHLETE_ACTIVITIES_ENDPOINT = '/athlete/activities'

export const SYNC_CONFIG = {
  FETCH_PAGE_SIZE: 200,
  BATCH_SIZE: 20,
} as const

export const STRAVA_VISIBILITY = {
  EVERYONE: 'everyone',
  FOLLOWERS_ONLY: 'followers_only',
  ONLY_ME: 'only_me',
} as const
