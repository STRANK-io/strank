import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const useLogOut = () => {
  const supabase = createClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
  })
}

export default useLogOut
