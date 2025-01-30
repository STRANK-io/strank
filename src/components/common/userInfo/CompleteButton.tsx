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
import { useCheckNicknameExistQuery } from '@/hooks/user/api/useCheckNicknameExistQuery'

interface CompleteButtonProps {
  userId: string
  text: string
  isMypage?: boolean
}

export const CompleteButton = ({ userId, text, isMypage }: CompleteButtonProps) => {
  const router = useRouter()

  const { profileImage, nickname, district } = useUserInfoStore()
  const { mutate, isPending } = useUpdateUserInfo()
  const { refetch: checkNickname } = useCheckNicknameExistQuery(nickname)

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

  const hasRequiredFields = nickname !== '' && district !== null && district !== ''

  const isButtonEnabled =
    hasRequiredFields &&
    (isMypage
      ? initialValuesRef.current &&
        (profileImage !== initialValuesRef.current.profileImage ||
          nickname !== initialValuesRef.current.nickname ||
          district !== initialValuesRef.current.district)
      : true)

  const handleComplete = async () => {
    if (!validateNickname(nickname)) {
      toast(
        <ToastContent text="닉네임은 특수문자, 숫자, 공백 제외한 한글, 영문 포함 2~10자 이내로 설정 가능합니다." />
      )
      return
    }

    try {
      const { data: isNicknameExists } = await checkNickname()

      if (isNicknameExists) {
        toast(<ToastContent text="이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요." />)
        return
      }

      if (!district) return

      mutate(
        {
          user_id: userId,
          nickname,
          district,
          profileImage,
        },
        {
          onSuccess: () => {
            if (isMypage) {
              initialValuesRef.current = {
                profileImage,
                nickname,
                district,
              }
            } else {
              router.push(ROUTES.PUBLIC.STRAVA_CONNECT)
            }
          },
          onError: error => {
            toast(<ToastContent text={ERROR_MESSAGES[error.message]} />)
          },
        }
      )
    } catch (error) {
      toast(<ToastContent text="닉네임 중복 확인 중 오류가 발생했습니다. 다시 시도해주세요." />)
    }
  }

  return (
    <PrimaryButton
      onClick={handleComplete}
      disabled={!isButtonEnabled || isPending}
      text={isPending ? '저장중...' : text}
    />
  )
}
