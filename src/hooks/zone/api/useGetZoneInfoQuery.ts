import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { ZoneType } from '@/lib/types/zone'

export const useGetZoneInfoQuery = (userId: string, zoneType: ZoneType) => {
  const supabase = createClient()

  return useQuery({
    queryKey: QUERY_KEYS.ZONE.INFO(userId, zoneType),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zone_info')
        .select('*')
        .eq('user_id', userId)
        .eq('zone_type', zoneType)
        .order('min', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}
