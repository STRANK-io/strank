'use client'

import { MoveToStravaButton } from '@/components/common/MoveToStravaButton'
import { cn } from '@/lib/utils/cn'
import { useState } from 'react'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { TimelineActivity } from '@/lib/types/timeline'
import { Skeleton } from '@/components/ui/skeleton'
import { formatActivityValue } from '@/lib/utils/activity'
import { logError } from '@/lib/utils/log'

const formatActivityDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'

    return date
      .toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\./g, '. ')
      .slice(0, -2)
  } catch (error) {
    logError('Date parsing error:', {
      error,
      functionName: 'formatActivityDate',
      dateString,
      dateStringType: typeof dateString,
    })
    return '-'
  }
}

interface TimelineActivityCardProps {
  activity?: TimelineActivity
  isLoading?: boolean
}

export default function TimelineActivityCard({ activity, isLoading }: TimelineActivityCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-[0px_8px_16px_0px_#00000017]">
        <div className="space-y-[6px]">
          <div className="flex items-start justify-between">
            <Skeleton className="h-[52px] w-3/4" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-[18px] w-24" />
        </div>
      </div>
    )
  }

  if (!activity) return null

  const activityFields = [
    {
      label: '총 이동거리',
      value: `${formatActivityValue(activity.distance, 'distance')} ${ACTIVITY_UNITS.DISTANCE}`,
    },
    {
      label: '평균 케이던스',
      value: `${formatActivityValue(activity.average_cadence)} ${ACTIVITY_UNITS.CADENCE}`,
    },
    {
      label: '총 고도상승',
      value: `${formatActivityValue(activity.total_elevation_gain)} ${ACTIVITY_UNITS.ELEVATION}`,
    },
    {
      label: '최대 심박수',
      value: `${formatActivityValue(activity.max_heartrate)} ${ACTIVITY_UNITS.HEART_RATE}`,
    },
    {
      label: '평균 속도',
      value: `${formatActivityValue(activity.average_speed, 'speed')} ${ACTIVITY_UNITS.SPEED}`,
    },
    {
      label: '평균 파워',
      value: `${formatActivityValue(activity.average_watts)} ${ACTIVITY_UNITS.POWER}`,
    },
    {
      label: '최고 속도',
      value: `${formatActivityValue(activity.max_speed, 'speed')} ${ACTIVITY_UNITS.SPEED}`,
    },
    {
      label: '최고 파워',
      value: `${formatActivityValue(activity.max_watts)} ${ACTIVITY_UNITS.POWER}`,
    },
  ]

  return (
    <div
      className={cn(
        'rounded-3xl bg-white p-6 shadow-[0px_8px_16px_0px_#00000017]',
        'text-brand-dark'
      )}
    >
      <div className="space-y-[6px] font-bold">
        <div className="flex items-start justify-between">
          <h2 className="line-clamp-2 text-xl leading-[26px]">{activity.name}</h2>
          <MoveToStravaButton type="activity" id={activity.activity_id} />
        </div>
        <p className="text-sm leading-[18.2px]">{formatActivityDate(activity.start_date)}</p>
      </div>

      <div
        className={cn(
          'grid grid-rows-[0fr] transition-all duration-300',
          isOpen && 'grid-rows-[1fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="my-6 grid grid-cols-2 gap-3">
            {activityFields.map(
              (field, index) =>
                field.value && (
                  <div key={index} className="flex items-center gap-1 font-bold">
                    <div className="rounded-lg bg-[#FFF8E9] px-2 py-[6px] text-[9px] leading-[10.74px] text-[#CCA672]">
                      {field.label}
                    </div>
                    <p className="text-sm leading-[18.2px]">{field.value}</p>
                  </div>
                )
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex w-full items-center justify-center">
        <button
          className="p-0 text-sm leading-[18.2px] outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? '닫기' : '더보기'}
        </button>
      </div>
    </div>
  )
}
