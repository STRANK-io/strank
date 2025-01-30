import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'

export const useCheckNicknameExistQuery = (nickname: string) => {
  const supabase = createClient()

  return useQuery<boolean>({
    queryKey: QUERY_KEYS.USER.CHECK_NICKNAME(nickname),
    queryFn: async () => {
      const { data } = await supabase.rpc('check_nickname_exists', {
        p_nickname: nickname,
      })

      return data ? true : false
    },
    enabled: false,
  })
}
