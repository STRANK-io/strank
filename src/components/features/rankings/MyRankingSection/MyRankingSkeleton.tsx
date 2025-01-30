'use client'

import { Caption } from '@/components/common/Caption'
import OutlineButton from '@/components/common/OutlineButton'
import { Skeleton } from '@/components/ui/skeleton'

export default function MyRankingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[72px] w-full rounded-2xl" />
      <div className="flex flex-col gap-[7px]">
        <OutlineButton text="랭킹 이미지 생성" onClick={() => {}} />
        <Caption text="* 이미지를 다운로드 후, 여러 SNS에 공유해보세요!" />
      </div>
    </div>
  )
}
