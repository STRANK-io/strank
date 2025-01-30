'use client'

import TimelineActivityCard from '@/components/features/timeline/TimelineActivityCard'
import { useTimelineQuery } from '@/hooks/activities/api/useTimelineQuery'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'
import ActivityCardSkeleton from '@/components/features/timeline/ActivityCardSkeleton'

export default function TimelinePage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useTimelineQuery()
  const { ref, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <div className="mt-[39px] space-y-4 px-5 pb-[150px]">
        {[...Array(3)].map((_, i) => (
          <ActivityCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!data?.pages[0].activities.length) {
    return (
      <div className="flex h-[calc(100dvh-39px)] items-center justify-center px-5 pb-[150px] text-brand-dark">
        데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="mt-[39px] space-y-6 px-5 pb-[150px]">
      {data.pages.map((page, i) => (
        <div key={i} className="space-y-6">
          {page.activities.map(activity => (
            <TimelineActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      ))}

      <div ref={ref} className="h-4" />

      {isFetchingNextPage && (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <ActivityCardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  )
}
