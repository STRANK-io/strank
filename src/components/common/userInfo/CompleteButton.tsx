'use client'

import { useEffect, useRef } from 'react'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { validateNickname } from '@/lib/utils/validation'
import useUpdateUserInfo from '@/hooks/user/api/useUpdateUserInfo'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_MESSAGES } from '@/lib/constants/error'
import { toast } from 'sonner'

interface CompleteButtonProps {
  userId: string
  text: string
  isMypage?: boolean
}

export const CompleteButton = ({ userId, text, isMypage }: CompleteButtonProps) => {
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

  const moveToStravaAuthPage = () => {
    // Strava OAuth 인증 요청
    const requiredScopes = ['read', 'profile:read_all', 'activity:read_all', 'activity:write']

    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${
      process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
    }&redirect_uri=${
      window.location.origin
    }/auth/strava/callback&response_type=code&scope=${encodeURIComponent(requiredScopes.join(','))}`

    window.location.href = authUrl
  }

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
            moveToStravaAuthPage()
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
