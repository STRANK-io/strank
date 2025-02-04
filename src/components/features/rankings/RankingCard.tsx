'use client'

import { CrownIcon } from '@/components/common/icons/CrownIcon'
import { cn } from '@/lib/utils/cn'
import { RankingFilters, ActivityWithRanking } from '@/lib/types/ranking'
import { MoveToStravaButton } from '@/components/common/MoveToStravaButton'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { ProfileImage } from '@/components/common/userInfo/ProfileImage'

interface RankingCardProps {
  activity: ActivityWithRanking
  variant?: 'default' | 'ranker'
  isMine?: boolean
  isTop1?: boolean
  criteria: RankingFilters['criteria']
}

export function RankingCard({
  activity,
  variant = 'default',
  isMine = false,
  isTop1 = false,
  criteria,
}: RankingCardProps) {
  const displayValue =
    criteria === 'distance'
      ? `${formatActivityValue(activity.totalDistance, 'distance')} ${ACTIVITY_UNITS.DISTANCE}`
      : `${formatActivityValue(activity.totalElevationGain)} ${ACTIVITY_UNITS.ELEVATION}`

  return (
    <div
      className={cn(
        'flex flex-1 gap-3 rounded-2xl bg-white px-3 py-4',
        variant === 'default' ? 'items-center justify-between ' : 'flex-col',
        'shadow-[0px_8px_16px_0px_#00000017]'
      )}
    >
      <span
        className={cn(
          'text-lg font-bold leading-[21.48px] ',
          isMine ? 'text-brand-primary' : 'text-[#CCA672]'
        )}
      >
        {activity.rank}위
      </span>

      <div
        className={cn(
          'flex flex-1 items-center gap-2',
          variant === 'default' ? '' : 'flex-col items-center text-center'
        )}
      >
        <div className="relative">
          {isTop1 && (
            <div className="absolute -top-[33px] left-1/2 flex w-full -translate-x-1/2 items-center justify-center">
              <CrownIcon />
            </div>
          )}
          <ProfileImage
            imageUrl={activity.user.imageUrl || null}
            size={variant === 'ranker' ? 94 : 40}
          />
        </div>

        <div
          className={cn(
            'flex flex-1 flex-col text-sm font-medium leading-[18.2px] text-brand-dark'
          )}
        >
          <span className="">{activity.user.nickname}</span>
          <span className="">{activity.user.district}</span>
        </div>
      </div>

      <div className={cn('flex items-center gap-2', variant === 'default' ? '' : 'justify-end')}>
        <span className="text-sm font-medium leading-[18.2px] text-brand-dark">{displayValue}</span>
        <MoveToStravaButton type="athlete" id={activity.user.athleteId} />
      </div>
    </div>
  )
}
