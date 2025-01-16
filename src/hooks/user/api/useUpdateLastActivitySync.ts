import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { logError } from '@/lib/utils/log'

const updateLastActivitySync = async (userId: string) => {
  const supabase = createClient()
  const { error } = await supabase
    .from('users')
    .update({ last_activity_sync_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    logError('Failed to update last activity sync:', { error })
  }
}

export const useUpdateLastActivitySync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateLastActivitySync,
    onSuccess: (_, userId) => {
      // 유저 정보 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.USER.INFO(userId),
      })
    },
  })
}
