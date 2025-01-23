import { useInfiniteQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { createClient } from '@/lib/supabase/client'
import { useUserContext } from '@/contexts/UserContext'
import { TimelineResponse } from '@/lib/types/timeline'
import { logError } from '@/lib/utils/log'

const PAGE_SIZE = 15

const fetchTimelineData = async (
  userId: string,
  cursor?: string | null
): Promise<TimelineResponse> => {
  const supabase = createClient()

  let query = supabase
    .from('activities')
    .select(
      `
      id,
      activity_id,
      name,
      start_date,
      distance,
      total_elevation_gain,
      average_speed,
      average_watts,
      max_speed,
      max_heartrate,
      average_cadence,
      max_watts
    `
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
    .limit(PAGE_SIZE)

  if (cursor) {
    query = query.lt('start_date', cursor)
  }

  const { data: activities, error } = await query

  if (error) {
    logError('Error fetching timeline data:', {
      error,
      functionName: 'fetchTimelineData',
    })
    return { activities: [], nextCursor: null }
  }

  const nextCursor =
    activities.length === PAGE_SIZE ? activities[activities.length - 1].start_date : null

  return {
    activities: activities || [],
    nextCursor,
  }
}

export const useTimelineQuery = () => {
  const { userId } = useUserContext()

  return useInfiniteQuery({
    queryKey: QUERY_KEYS.TIMELINE.ACTIVITIES(),
    queryFn: ({ pageParam }) => fetchTimelineData(userId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
  })
}
