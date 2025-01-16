'use client'

import Link from 'next/link'
import { useUserId } from '@/contexts/UserContext'
import { UserInfoForm } from '@/components/common/userInfo/userInfoForm/UserInfoForm'
import { CompleteButton } from '@/components/common/userInfo/CompleteButton'
import { LogOutButton } from '@/components/features/auth/LogOutButton'
import { WithdrawalButton } from '@/components/features/auth/WithdrawalButton'
import SyncRecentActivityButton from '@/components/features/mypage/SyncRecentActivityButton'

export default function MypagePage() {
  const userId = useUserId()

  return (
    <div className="space-y-20 pb-[150px]">
      <UserInfoForm userId={userId} />
      <div className="flex flex-col items-center gap-3 px-5">
        <CompleteButton userId={userId} text="저장 완료" isMypage />
        <SyncRecentActivityButton />
      </div>
      <div className="flex w-full flex-col items-center justify-center gap-4 text-sm font-bold leading-[18.2px] text-brand-dark">
        <Link href="https://bit.ly/strank" className="underline decoration-brand-dark">
          공지사항
        </Link>
        <p className="no-underline">제안 & 오류 신고 : support@strank.io</p>
      </div>
      <div className="flex w-full flex-col items-center justify-center gap-6 text-sm font-bold leading-[18.2px]">
        <LogOutButton />
        <WithdrawalButton />
      </div>
    </div>
  )
}
