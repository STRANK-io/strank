import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'

export const useGetUserInfoQuery = (userId: string) => {
  const supabase = createClient()

  return useQuery({
    queryKey: QUERY_KEYS.USER.INFO(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('profile, name, district, last_activity_sync_at')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      return data || null
    },
    enabled: !!userId,
  })
}
