'use client'

import { useEffect } from 'react'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { NicknameInput } from '@/components/common/userInfo/userInfoForm/NicknameInput'
import { RegionSelect } from '@/components/common/userInfo/userInfoForm/RegionSelect'
import { useGetUserInfoQuery } from '@/hooks/user/api/useGetUserInfoQuery'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { ToastContent } from '@/components/common/ToastContent'
import { toast } from 'sonner'
import { ProfileImageSection } from '@/components/common/userInfo/userInfoForm/ProfileImageSection'
import { convertAndCreatePreview } from '@/lib/utils/image'
import { logError } from '@/lib/utils/log'

export const UserInfoForm = ({ userId }: { userId: string }) => {
  const { data: userInfo } = useGetUserInfoQuery(userId)
  const {
    imagePreviewUrl,
    nickname,
    district,
    setProfileImage,
    setImagePreviewUrl,
    setNickname,
    setDistrict,
  } = useUserInfoStore()

  useEffect(() => {
    if (userInfo) {
      if (userInfo.profile) setImagePreviewUrl(userInfo.profile)
      if (userInfo.name) setNickname(userInfo.name)
      if (userInfo.district) setDistrict(userInfo.district)
    }
  }, [userInfo, setImagePreviewUrl, setNickname, setDistrict])

  const handleImageChange = async (file: File) => {
    try {
      const result = await convertAndCreatePreview(file)
      setProfileImage(result.processedFile)
      setImagePreviewUrl(result.previewUrl)
    } catch (error) {
      logError('Failed to change profile image', {
        error,
        functionName: 'handleImageChange',
      })
      toast(<ToastContent text={ERROR_MESSAGES[ERROR_CODES.AUTH.IMAGE_PROCESSING_FAILED]} />)
    }
  }

  return (
    <div className="mt-6 w-full px-5">
      <ProfileImageSection
        imageUrl={imagePreviewUrl}
        onImageChange={handleImageChange}
        buttonText="프로필 변경"
      />
      <div className="mb-[48px] mt-[11px]">
        <NicknameInput
          initialValue={userInfo?.name || nickname}
          onChange={(value: string) => {
            setNickname(value)
          }}
        />
      </div>
      <RegionSelect value={district} onChange={setDistrict} />
    </div>
  )
}
