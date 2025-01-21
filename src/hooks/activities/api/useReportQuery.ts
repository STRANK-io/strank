import { useSuspenseQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { createClient } from '@/lib/supabase/client'
import { useUserContext } from '@/contexts/UserContext'
import { DateRange, ReportResponse } from '@/lib/types/report'
import { logError } from '@/lib/utils/log'

const fetchReportData = async (dateRange: DateRange, userId: string): Promise<ReportResponse> => {
  const supabase = createClient()

  const now = new Date()
  const startDate = new Date(now)

  switch (dateRange) {
    case '3months':
      startDate.setMonth(now.getMonth() - 3)
      break
    case '1month':
      startDate.setMonth(now.getMonth() - 1)
      break
    case '1week':
      startDate.setDate(now.getDate() - 7)
      break
  }

  const { data: activities, error } = await supabase
    .from('activities')
    .select(
      `
      id,
      start_date,
      distance,
      total_elevation_gain,
      average_speed,
      average_watts
    `
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('start_date', startDate.toISOString())
    .lte('start_date', now.toISOString())
    .order('start_date', { ascending: false })

  if (error) {
    logError('Error fetching report data:', {
      error,
      functionName: 'fetchReportData',
    })
    return { activities: [] }
  }

  if (!activities) {
    return { activities: [] }
  }

  return {
    activities: activities.map(activity => ({
      id: activity.id,
      date: activity.start_date ? new Date(activity.start_date).toLocaleDateString() : '',
      distance: activity.distance || 0,
      total_elevation_gain: activity.total_elevation_gain || 0,
      average_speed: activity.average_speed || 0,
      average_watts: activity.average_watts || 0,
    })),
  }
}

export const useReportQuery = (dateRange: DateRange) => {
  const { userId } = useUserContext()

  return useSuspenseQuery({
    queryKey: QUERY_KEYS.REPORT.ACTIVITIES(dateRange),
    queryFn: () => fetchReportData(dateRange, userId),
  })
}
