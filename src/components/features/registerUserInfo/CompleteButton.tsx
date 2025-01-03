'use client'

import { useUserInfoStore } from '@/store/userInfoStore'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { validateNickname } from '@/lib/utils/validation'
import useUpdateUserInfo from '@/hooks/user/api/useUpdateUserInfo'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_MESSAGES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { toast } from 'sonner'

export const CompleteButton = ({ user }: { user: User }) => {
  const router = useRouter()
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
          router.push(ROUTES.PUBLIC.STRAVA_SYNC)
        },
        onError: error => {
          toast(<ToastContent text={ERROR_MESSAGES[error.message]} />)
        },
      }
    )
  }

  return <PrimaryButton onClick={handleComplete} disabled={!isValid} text="입력 완료" />
}
