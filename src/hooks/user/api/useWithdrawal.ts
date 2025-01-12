import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'

const useWithdrawal = () => {
  const supabase = createClient()
  const user = useUser()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not found')

      const now = new Date().toISOString()

      try {
        // 활동 데이터 soft delete
        const { error: activitiesError } = await supabase
          .from('activities')
          .update({ deleted_at: now })
          .eq('user_id', user.id)

        if (activitiesError) throw activitiesError

        // 유저 데이터 soft delete
        const { error: userError } = await supabase
          .from('users')
          .update({ deleted_at: now })
          .eq('id', user.id)

        if (userError) {
          // 활동 데이터 soft delete 롤백
          await supabase
            .from('activities')
            .update({ deleted_at: null })
            .eq('user_id', user.id)
            .then(({ error }) => {
              if (error) {
                console.error('Failed to rollback activities soft delete:', error)
              }
            })

          throw userError
        }

        // 로그아웃
        await supabase.auth.signOut()
      } catch (error) {
        throw error
      }
    },
  })
}

export default useWithdrawal
