import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ERROR_CODES, ErrorMessageCode } from '@/lib/constants/error'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'

interface UpdateUserInfoParams {
  user_id: string
  nickname: string
  district: string
  profileImage: File | null
}

const useUpdateUserInfo = () => {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation<void, { message: ErrorMessageCode }, UpdateUserInfoParams>({
    mutationFn: async ({ user_id, nickname, district, profileImage }: UpdateUserInfoParams) => {
      let uploadedFileName: string | null = null
      let profileImageUrl: string | null = null

      try {
        if (profileImage) {
          uploadedFileName = `${user_id}.png`

          const { error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(uploadedFileName, profileImage, {
              cacheControl: '0',
              upsert: true,
            })

          if (uploadError) {
            throw new Error(ERROR_CODES.AUTH.IMAGE_UPLOAD_FAILED)
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('profile-images').getPublicUrl(uploadedFileName)

          profileImageUrl = `${publicUrl}?v=${Date.now()}`
        }

        const { error: rpcError } = await supabase.rpc('update_user_info', {
          nickname,
          district,
          profile_image_url: profileImageUrl ?? undefined,
        })

        if (rpcError) {
          throw new Error(ERROR_CODES.INTERNAL_ERROR)
        }

        return
      } catch (error) {
        if (uploadedFileName) {
          await supabase.storage
            .from('profile-images')
            .remove([uploadedFileName])
            .catch(e => console.error('Failed to remove uploaded image:', e))
        }

        console.error('Error in updateUserInfo:', error)
        throw new Error(ERROR_CODES.INTERNAL_ERROR)
      }
    },
    onSuccess: (_, { user_id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.INFO(user_id) })
    },
  })
}

export default useUpdateUserInfo
