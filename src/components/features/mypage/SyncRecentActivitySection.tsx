'use client'

import { useUserContext } from '@/contexts/UserContext'
import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { useState } from 'react'
import { isSameDay } from 'date-fns'
import { useUpdateLastActivitySync } from '@/hooks/user/api/useUpdateLastActivitySync'
import { useGetUserInfoQuery } from '@/hooks/user/api/useGetUserInfoQuery'
import { useSyncStravaActivities } from '@/hooks/activities/api/useSyncStravaActivities'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { NavigationBlockDialog } from './NavigationBlockDialog'
import { useNavigationBlock } from '@/hooks/common/useNavigationBlock'

export default function SyncRecentActivitySection() {
  const { userId } = useUserContext()
  const [isPending, setIsPending] = useState(false)
  const { data: user } = useGetUserInfoQuery(userId)
  const { mutate: syncActivities } = useSyncStravaActivities()
  const { mutateAsync: updateLastActivitySync } = useUpdateLastActivitySync()

  const { showAlert, setShowAlert, handleNavigationConfirm } = useNavigationBlock({
    shouldBlock: isPending,
  })

  const handleSyncRecentActivity = async () => {
    if (isPending) return
    setIsPending(true)

    try {
      // 0. 유저 정보 확인
      if (!user) {
        toast(
          <ToastContent text="유저 정보를 불러오는 중 오류가 발생했습니다. 에러가 반복될 경우 관리자에게 문의해주세요." />
        )
        return
      }

      // 1. 마지막 동기화 시간 확인
      if (
        user.last_activity_sync_at &&
        isSameDay(new Date(user.last_activity_sync_at), new Date())
      ) {
        toast(<ToastContent text="액티비티 최신화는 하루에 한 번 가능합니다." />)
        setIsPending(false)
        return
      }

      // 2. 활동 데이터 동기화
      syncActivities(userId, {
        onSuccess: async () => {
          // 3. 마지막 동기화 시간 업데이트
          await updateLastActivitySync(userId)
          toast(<ToastContent text="액티비티 최신화가 완료되었습니다." />)
        },
        onError: error => {
          if (error instanceof Error) {
            if (error.message === ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED) {
              toast(
                <ToastContent text={ERROR_MESSAGES[ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED]} />
              )
            } else {
              toast(<ToastContent text={ERROR_MESSAGES[ERROR_CODES.STRAVA.ACTIVITY_SYNC_FAILED]} />)
            }
          } else {
            toast(<ToastContent text={ERROR_MESSAGES[ERROR_CODES.STRAVA.ACTIVITY_SYNC_FAILED]} />)
          }
        },
        onSettled: () => {
          setIsPending(false)
        },
      })
    } catch (error) {
      toast(<ToastContent text={ERROR_MESSAGES[ERROR_CODES.STRAVA.ACTIVITY_SYNC_FAILED]} />)
      logError('Failed to sync recent activities', {
        error,
        functionName: 'handleSyncRecentActivity',
      })
      setIsPending(false)
    }
  }

  return (
    <>
      <div className="flex items-end gap-5">
        <p className="text-base font-bold leading-[20.8px] text-brand-dark">동기화</p>
        <p className="text-sm font-normal leading-[16.9px] text-[#818181]">
          (하루에 1회만 가능해요.)
        </p>
      </div>
      <PrimaryButton
        onClick={handleSyncRecentActivity}
        disabled={isPending}
        text={isPending ? '최신화 중...' : '액티비티 최신화'}
      />

      <NavigationBlockDialog
        open={showAlert}
        onOpenChange={setShowAlert}
        onConfirm={handleNavigationConfirm}
      />
    </>
  )
}
