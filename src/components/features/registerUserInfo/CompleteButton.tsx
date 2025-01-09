'use client'

import { useUserInfoStore } from '@/stores/userInfoStore'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { validateNickname } from '@/lib/utils/validation'
import useUpdateUserInfo from '@/hooks/user/api/useUpdateUserInfo'
import { User } from '@supabase/supabase-js'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_MESSAGES } from '@/lib/constants/error'
import { toast } from 'sonner'

export const CompleteButton = ({ user }: { user: User }) => {
  const { profileImage, nickname, district } = useUserInfoStore()
  const { mutate, isPending } = useUpdateUserInfo()
  const isValid = validateNickname(nickname) && district !== null

  const handleComplete = async () => {
    if (!isValid || !district) return

    mutate(
      {
        user_id: user.id,
        nickname,
        district,
        profileImage,
      },
      {
        onSuccess: () => {
          // Strava OAuth 인증 요청
          const requiredScopes = ['read', 'profile:read_all', 'activity:read_all', 'activity:write']

          const authUrl = `https://www.strava.com/oauth/authorize?client_id=${
            process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
          }&redirect_uri=${
            window.location.origin
          }/auth/strava/callback&response_type=code&scope=${encodeURIComponent(
            requiredScopes.join(',')
          )}`

          window.location.href = authUrl
        },
        onError: error => {
          toast(<ToastContent text={ERROR_MESSAGES[error.message]} />)
        },
      }
    )
  }

  return (
    <PrimaryButton onClick={handleComplete} disabled={!isValid || isPending} text="입력 완료" />
  )
}
