import { create } from 'zustand'

interface UserInfoState {
  // 상태
  profileImage: File | null
  imagePreviewUrl: string | null
  nickname: string
  province: string | null
  district: string | null
  ftpValue: number | null
  heartValue: number | null

  // 액션
  setProfileImage: (file: File | null) => void
  setImagePreviewUrl: (url: string | null) => void
  setNickname: (name: string) => void
  setProvince: (province: string | null) => void
  setDistrict: (district: string | null) => void
  setFtpValue: (ftpValue: number | null) => void
  setHeartValue: (heartValue: number | null) => void
  reset: () => void
}

export const useUserInfoStore = create<UserInfoState>(set => ({
  // 초기 상태
  profileImage: null,
  imagePreviewUrl: null,
  nickname: '',
  province: null,
  district: null,
  ftpValue: null,
  heartValue: null,

  // 액션
  setProfileImage: file => set({ profileImage: file }),
  setImagePreviewUrl: url => set({ imagePreviewUrl: url }),
  setNickname: name => set({ nickname: name }),
  setProvince: province => set({ province }),
  setDistrict: district => set({ district }),
  setFtpValue: ftpValue => set({ ftpValue }),
  setHeartValue: heartValue => set({ heartValue }),
  reset: () =>  
    set({
      profileImage: null,
      imagePreviewUrl: null,
      nickname: '',
      province: null,
      district: null,
      ftpValue: null,
      heartValue: null,
    }),
}))
