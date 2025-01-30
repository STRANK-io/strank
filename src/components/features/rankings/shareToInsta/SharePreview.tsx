'use client'

import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { ActivityWithRanking, RankingFilters } from '@/lib/types/ranking'
import { formatActivityValue } from '@/lib/utils/activity'
import Image from 'next/image'
import { useRef } from 'react'

interface SharePreviewProps {
  backgroundImage: string
  myRankingActivity: ActivityWithRanking
  criteria: RankingFilters['criteria']
  period: RankingFilters['period']
}

export default function SharePreview({
  backgroundImage,
  myRankingActivity,
  criteria,
  period,
}: SharePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)

  const {
    rank,
    totalDistance,
    totalElevationGain,
    user: { nickname, district },
  } = myRankingActivity

  const criteriaText = criteria === 'distance' ? '거리' : '고도'
  const criteriaValue =
    criteria === 'distance'
      ? `${formatActivityValue(totalDistance, 'distance')} ${ACTIVITY_UNITS.DISTANCE}`
      : `${formatActivityValue(totalElevationGain)} ${ACTIVITY_UNITS.ELEVATION}`

  const getFormattedDate = (period: RankingFilters['period']) => {
    const today = new Date()

    if (period === 'lastweek') {
      const lastSunday = new Date(today)
      const currentDay = today.getDay()
      // 지난주 일요일 계산
      const daysToLastSunday = currentDay === 0 ? -7 : -currentDay
      lastSunday.setDate(today.getDate() + daysToLastSunday)

      return lastSunday
        .toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\s/g, '')
        .replace(/\./g, '.')
        .slice(0, -1)
    }

    return today
      .toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\s/g, '')
      .replace(/\./g, '.')
      .slice(0, -1)
  }

  const formattedDate = getFormattedDate(period)

  return (
    <div
      data-share-preview="true"
      ref={previewRef}
      className="relative h-[305px] w-[305px] overflow-hidden"
    >
      {/* 배경 이미지 */}
      <div className="absolute inset-0">
        <Image
          src={backgroundImage}
          alt="Background"
          width={305}
          height={305}
          className="h-full w-full object-cover"
          priority
          unoptimized
        />
      </div>

      {/* 오버레이 콘텐츠 */}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/30 p-4 text-white">
        {/* 상단 */}
        <div className="flex flex-col gap-2 font-bold">
          <span className="line-clamp-2 text-[32px] leading-[41.6px]">{nickname}</span>
          <span className="text-sm leading-[18.2px]">{formattedDate}</span>
        </div>

        {/* 하단: 라이딩 데이터 */}
        <div className="space-y-1">
          <div className="flex items-center gap-[6px]">
            <div className="inline-flex h-[22px] items-center justify-center rounded-[8px] bg-[#FFF8E9] px-2 text-[9px] font-bold text-[#CCA672]">
              <span className="translate-y-[0.5px]">{`${criteriaText} 기준`}</span>
            </div>
            <span className="text-sm font-bold leading-[18.2px]">
              <span className="text-brand-primary"> {rank}위</span> / {criteriaValue}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-medium leading-[18.2px]">
            <span>서울시 {district}</span>
            <span>strank.io</span>
          </div>
        </div>
      </div>
    </div>
  )
}
