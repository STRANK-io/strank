'use client'

import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { UserInfoForm } from '@/components/common/userInfo/userInfoForm/UserInfoForm'
import { CompleteButton } from '@/components/common/userInfo/CompleteButton'
import { LogOutButton } from '@/components/features/auth/LogOutButton'
import { WithdrawalButton } from '@/components/features/auth/WithdrawalButton'

export default function MypagePage() {
  const user = useUser()

  return (
    <div className="space-y-20 pb-[150px]">
      <UserInfoForm userId={user.id} />
      <div className="px-5">
        <CompleteButton userId={user.id} text="저장 완료" isMypage />
      </div>
      <div className="flex w-full flex-col items-center justify-center gap-4 text-sm font-bold leading-[18.2px] text-brand-dark">
        <Link href="https://bit.ly/strank" className="underline decoration-brand-dark">
          공지사항
        </Link>
        <p>제안 & 오류 신고 : support@strank.io</p>
      </div>
      <div className="flex w-full flex-col items-center justify-center gap-6 text-sm font-bold leading-[18.2px]">
        <LogOutButton />
        <WithdrawalButton />
      </div>
    </div>
  )
}
