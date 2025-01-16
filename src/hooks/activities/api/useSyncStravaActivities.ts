import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ERROR_CODES } from '@/lib/constants/error'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'

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
  const queryClient = useQueryClient()

  return useMutation<string, Error, string>({
    mutationFn: syncStravaActivities,
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.RANKINGS.DEFAULT,
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REPORT.DEFAULT,
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TIMELINE.ACTIVITIES(),
      })
    },
  })
}
