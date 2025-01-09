'use client'

import { ActivityWithRanking, RankingFilters } from '@/lib/types/ranking'
import Image from 'next/image'
import { useRef } from 'react'

interface SharePreviewProps {
  backgroundImage: string
  myRankingActivity: ActivityWithRanking
  criteria: RankingFilters['criteria']
}

export default function SharePreview({
  backgroundImage,
  myRankingActivity,
  criteria,
}: SharePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)

  const {
    name,
    rank,
    distance,
    elevation,
    date,
    user: { district },
  } = myRankingActivity

  const criteriaText = criteria === 'distance' ? '거리' : '고도'
  const criteriaValue =
    criteria === 'distance' ? `${(distance / 1000).toFixed(1)}km` : `${elevation}m`
  const formattedDate = new Date(date)
    .toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\s/g, '')
    .replace(/\./g, '. ')

  return (
    <div
      data-preview="true"
      ref={previewRef}
      className="relative h-full max-h-[305px] w-full max-w-[305px] overflow-hidden"
    >
      {/* 배경 이미지 */}
      <div className="h-full w-full bg-white">
        <Image
          src={backgroundImage}
          alt="Background"
          width={305}
          height={305}
          className="h-full w-full object-cover"
          priority
        />
      </div>

      {/* 오버레이 콘텐츠 */}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/30 p-4 text-white">
        {/* 상단 */}
        <div className="flex flex-col gap-2 font-bold">
          <span className="line-clamp-2 text-xl leading-[26px]">{name}</span>
          <span className="text-sm leading-[18.2px]">{formattedDate}</span>
        </div>

        {/* 하단: 라이딩 데이터 */}
        <div className="space-y-1">
          <div className="flex items-center gap-[6px]">
            <div className="h-fit rounded-[8px] bg-[#FFF8E9] px-2 py-[6px] text-[9px] font-bold leading-[10.74px] text-[#CCA672]">{`${criteriaText} 기준`}</div>
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
