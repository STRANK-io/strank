import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUserContext } from '@/contexts/UserContext'
import { logError } from '@/lib/utils/log'

const useWithdrawal = () => {
  const supabase = createClient()
  const { userId } = useUserContext()

  return useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString()

      // 활동 데이터 soft delete
      const { error: activitiesError } = await supabase
        .from('activities')
        .update({ deleted_at: now })
        .eq('user_id', userId)

      if (activitiesError) throw activitiesError

      const { error: stravaUserTokenError } = await supabase
        .from('strava_user_tokens')
        .update({ deleted_at: now })
        .eq('user_id', userId)

      if (stravaUserTokenError) {
        throw stravaUserTokenError
      }

      // 유저 데이터 soft delete
      const { error: userError } = await supabase
        .from('users')
        .update({ deleted_at: now })
        .eq('id', userId)

      if (userError) {
        // 활동 데이터 soft delete 롤백
        const { error: rollbackError } = await supabase
          .from('activities')
          .update({ deleted_at: null })
          .eq('user_id', userId)

        if (rollbackError) {
          logError('Failed to rollback activities:', {
            functionName: 'useWithdrawal',
            error: rollbackError,
          })
        }

        throw userError
      }

      // 로그아웃
      await supabase.auth.signOut()
    },
  })
}

export default useWithdrawal
