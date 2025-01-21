'use client'

import { useEffect, useRef } from 'react'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { validateNickname } from '@/lib/utils/validation'
import useUpdateUserInfo from '@/hooks/user/api/useUpdateUserInfo'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_MESSAGES } from '@/lib/constants/error'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants/routes'

interface CompleteButtonProps {
  userId: string
  text: string
  isMypage?: boolean
}

export const CompleteButton = ({ userId, text, isMypage }: CompleteButtonProps) => {
  const router = useRouter()
  const { profileImage, nickname, district } = useUserInfoStore()
  const { mutate, isPending } = useUpdateUserInfo()
  const initialValuesRef = useRef<{
    profileImage: File | null
    nickname: string
    district: string | null
  } | null>(null)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (isMypage && !isInitializedRef.current && nickname && district) {
      initialValuesRef.current = {
        profileImage,
        nickname,
        district,
      }
      isInitializedRef.current = true
    }
  }, [isMypage, profileImage, nickname, district])

  const isBasicValid = validateNickname(nickname) && district !== null

  const isChanged =
    !isMypage ||
    (initialValuesRef.current &&
      (profileImage !== initialValuesRef.current.profileImage ||
        nickname !== initialValuesRef.current.nickname ||
        district !== initialValuesRef.current.district))

  const isValid = isBasicValid && isChanged

  const handleComplete = async () => {
    if (!isValid) return

    mutate(
      {
        user_id: userId,
        nickname,
        district,
        profileImage,
      },
      {
        onSuccess: () => {
          initialValuesRef.current = {
            profileImage,
            nickname,
            district,
          }

          if (!isMypage) {
            router.push(ROUTES.PUBLIC.STRAVA_CONNECT)
          }
        },
        onError: error => {
          toast(<ToastContent text={ERROR_MESSAGES[error.message]} />)
        },
      }
    )
  }

  return <PrimaryButton onClick={handleComplete} disabled={!isValid || isPending} text={text} />
}
