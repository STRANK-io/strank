'use client'

import StravaActivityButton from '@/components/common/StravaActivityButton'
import { cn } from '@/lib/utils/cn'
import { useState } from 'react'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { TimelineActivity } from '@/lib/types/timeline'
import { Skeleton } from '@/components/ui/skeleton'
import { formatActivityValue } from '@/lib/utils/activity'

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
      value: formatActivityValue(activity.distance, true),
      unit: ACTIVITY_UNITS.distance,
    },
    {
      label: '평균 케이던스',
      value: formatActivityValue(activity.average_cadence),
      unit: ACTIVITY_UNITS.cadence,
    },
    {
      label: '총 고도상승',
      value: formatActivityValue(activity.total_elevation_gain),
      unit: ACTIVITY_UNITS.elevation,
    },
    {
      label: '최대 심박수',
      value: formatActivityValue(activity.max_heartrate),
      unit: ACTIVITY_UNITS.heart_rate,
    },
    {
      label: '평균 속도',
      value: formatActivityValue(activity.average_speed),
      unit: ACTIVITY_UNITS.speed,
    },
    {
      label: '평균 파워',
      value: formatActivityValue(activity.average_watts),
      unit: ACTIVITY_UNITS.power,
    },
    {
      label: '최고 속도',
      value: formatActivityValue(activity.max_speed),
      unit: ACTIVITY_UNITS.speed,
    },
    {
      label: '최고 파워',
      value: formatActivityValue(activity.max_watts),
      unit: ACTIVITY_UNITS.power,
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
          <StravaActivityButton activityId={activity.id} />
        </div>
        <p className="text-sm leading-[18.2px]">
          {activity.start_date
            ? new Date(activity.start_date)
                .toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })
                .slice(0, -1)
            : ''}
        </p>
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
                    <p className="text-sm leading-[18.2px]">
                      {field.value}
                      {field.unit}
                    </p>
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
{
  /* TODO: 한줄할지 두줄할지 결정하고 공유할것에 적기 */
}
