'use client'

import Link from 'next/link'
import { useUserContext } from '@/contexts/UserContext'
import { UserInfoForm } from '@/components/common/userInfo/userInfoForm/UserInfoForm'
import { CompleteButton } from '@/components/common/userInfo/CompleteButton'
import { LogOutButton } from '@/components/features/auth/LogOutButton'
import { WithdrawalButton } from '@/components/features/auth/WithdrawalButton'
import SyncRecentActivitySection from '@/components/features/mypage/SyncRecentActivitySection'
import ZoneSection from '@/components/features/mypage/ZoneSection'
import { useGetUserInfoQuery } from '@/hooks/user/api/useGetUserInfoQuery'

export default function MypagePage() {
  const { userId } = useUserContext();
  const { data: userInfo } = useGetUserInfoQuery(userId);

  return (
    <div className="space-y-12 pb-[75px]">
      <section className="flex flex-col items-center gap-6">
        <div className="mt-6 w-full">
          <UserInfoForm userId={userId} />
        </div>
        <div className="w-full px-5">
          <CompleteButton userId={userId} text="저장 완료" isMypage />
        </div>
      </section>

      <section className="w-full space-y-2 px-5">
        <ZoneSection userInfo={userInfo || null} />
      </section>

      <section className="w-full space-y-2 px-5">
        <SyncRecentActivitySection />
      </section>

      <section className="flex w-full flex-col items-center justify-center gap-4 text-sm font-bold leading-[18.2px] text-brand-dark">
        <Link
          href="https://strank.framer.website/notice/description-error"
          className=" text-sm underline decoration-brand-dark"
        >
          디스크립션 오류 해결 방법
        </Link>
        <Link href="https://strank.framer.website" className="underline decoration-brand-dark">
          공지사항
        </Link>
        <div className="flex items-center gap-1">
          <span>제안 & 오류 신고 : </span>
          <a href="mailto:support@strank.io" className="hover:underline">
            support@strank.io
          </a>
        </div>
      </section>

      <section className="flex w-full flex-col items-center justify-center gap-12 text-sm font-bold leading-[18.2px]">
        <LogOutButton />
        <WithdrawalButton />
      </section>
    </div>
  )
}
