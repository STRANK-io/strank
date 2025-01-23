'use client'

import Link from 'next/link'
import { useUserContext } from '@/contexts/UserContext'
import { UserInfoForm } from '@/components/common/userInfo/userInfoForm/UserInfoForm'
import { CompleteButton } from '@/components/common/userInfo/CompleteButton'
import { LogOutButton } from '@/components/features/auth/LogOutButton'
import { WithdrawalButton } from '@/components/features/auth/WithdrawalButton'
import SyncRecentActivitySection from '@/components/features/mypage/SyncRecentActivitySection'
import { toast } from 'sonner'

export default function MypagePage() {
  const { userId } = useUserContext()

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('support@strank.io')
      toast('이메일 주소가 클립보드에 복사되었습니다.')
    } catch (error) {
      toast('클립보드 복사에 실패했습니다.')
    }
  }

  // TODO: 이메일 주소 클릭시 클립보드에 복사하고         toast(<ToastContent text="액티비티 최신화는 하루에 한 번 가능합니다." />) 띄워주기

  return (
    <div className="space-y-16 pb-[150px]">
      <section className="flex flex-col items-center gap-6">
        <UserInfoForm userId={userId} />
        <div className="w-full px-5">
          <CompleteButton userId={userId} text="저장 완료" isMypage />
        </div>
      </section>
      <section className="w-full space-y-2 px-5">
        <SyncRecentActivitySection />
      </section>
      <section className="flex w-full flex-col items-center justify-center gap-4 text-sm font-bold leading-[18.2px] text-brand-dark">
        <Link href="https://bit.ly/strank" className="underline decoration-brand-dark">
          공지사항
        </Link>
        <button onClick={handleCopyEmail} className="no-link-decoration cursor-pointer">
          제안 & 오류 신고 : support@strank.io
        </button>
      </section>
      <section className="flex w-full flex-col items-center justify-center gap-12 text-sm font-bold leading-[18.2px]">
        <LogOutButton />
        <WithdrawalButton />
      </section>
    </div>
  )
}
