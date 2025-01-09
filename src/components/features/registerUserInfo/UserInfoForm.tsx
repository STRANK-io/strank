'use client'

import { useEffect } from 'react'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { NicknameInput } from '@/components/common/userInfo/NicknameInput'
import { RegionSelect } from '@/components/common/userInfo/RegionSelect'
import { User } from '@supabase/supabase-js'
import { useGetUserInfoQuery } from '@/hooks/user/api/useGetUserInfoQuery'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { ToastContent } from '@/components/common/ToastContent'
import { toast } from 'sonner'
import { ProfileImage } from '@/components/common/userInfo/ProfileImage'
import { convertAndCreatePreview } from '@/lib/utils/image'

export const UserInfoForm = ({ user }: { user: User }) => {
  const { data: userInfo } = useGetUserInfoQuery(user.id)
  const {
    imagePreviewUrl,
    nickname,
    district,
    setProfileImage,
    setImagePreviewUrl,
    setNickname,
    setDistrict,
  } = useUserInfoStore()

  // 초기 유저 정보 설정
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
      console.error('Image processing error:', error)
      toast(<ToastContent text={ERROR_MESSAGES[ERROR_CODES.AUTH.IMAGE_PROCESSING_FAILED]} />)
    }
  }

  return (
    <section className="mt-[48px] px-5">
      <ProfileImage
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
    </section>
  )
}
