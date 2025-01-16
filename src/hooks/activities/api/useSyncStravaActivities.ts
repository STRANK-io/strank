import { useMutation } from '@tanstack/react-query'
import { ERROR_CODES } from '@/lib/constants/error'

interface SyncResponse {
  message: string
}

const syncStravaActivities = async (userId: string): Promise<string> => {
  const response = await fetch('/api/strava/activities/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    const { error } = await response.json()
    throw new Error(error || ERROR_CODES.STRAVA_ACTIVITY_UPDATE_FAILED)
  }

  const { message } = (await response.json()) as SyncResponse
  return message
}

export const useSyncStravaActivities = () => {
  return useMutation<string, Error, string>({
    mutationFn: syncStravaActivities,
    onSuccess: (_, userId) => {
      // TODO: 랭킹, 리포트, 타임라인 데이터 쿼리 무효화
    },
  })
}
