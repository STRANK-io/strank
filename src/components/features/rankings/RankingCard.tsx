'use client'

import Image from 'next/image'
import { DefaultUserIcon } from '@/components/common/icons/DefaultUserIcon'
import { CrownIcon } from '@/components/common/icons/CrownIcon'
import { cn } from '@/lib/utils/cn'
import { RankingFilters, ActivityWithRanking } from '@/lib/types/ranking'
import StravaActivityButton from '@/components/common/StravaActivityButton'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'

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
      ? `${formatActivityValue(activity.distance, true)}${ACTIVITY_UNITS.distance}`
      : `${formatActivityValue(activity.total_elevation_gain)}${ACTIVITY_UNITS.elevation}`

  return (
    <div
      className={cn(
        'flex flex-1 gap-3 rounded-2xl bg-white px-3 py-4',
        variant === 'default' ? 'items-center justify-between ' : 'flex-col'
      )}
      style={{ boxShadow: '0px 8px 16px 0px #00000017' }}
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
          <div
            className={cn(
              'overflow-hidden rounded-full',
              variant === 'ranker' ? 'h-[94px] w-[94px]' : 'h-[40px] w-[40px]'
            )}
          >
            {activity.user.imageUrl ? (
              <Image
                src={activity.user.imageUrl}
                alt="User Image"
                width={variant === 'ranker' ? 94 : 40}
                height={variant === 'ranker' ? 94 : 40}
              />
            ) : (
              <DefaultUserIcon
                width={variant === 'ranker' ? 94 : 40}
                height={variant === 'ranker' ? 94 : 40}
              />
            )}
          </div>
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
        <StravaActivityButton activityId={activity.id} />
      </div>
    </div>
  )
}
