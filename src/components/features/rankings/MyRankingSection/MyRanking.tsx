import { useMyRankingQuery } from '@/hooks/activities/api/useMyRankingQuery'
import { RankingCard } from '@/components/features/rankings/RankingCard'
import ShareDialog from '@/components/features/rankings/shareToInsta/ShareDialog'
import { useState } from 'react'
import { useRankingFilters } from '@/stores/rankingFilters'
import OutlineButton from '@/components/common/OutlineButton'
import { Caption } from '@/components/common/Caption'

const DEFAULT_SHARE_IMAGE = '/images/strank-vertical-white.png'

export default function MyRanking() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { filters } = useRankingFilters()

  const { data: myRankingActivity } = useMyRankingQuery(filters)

  if (!myRankingActivity)
    return <p className="text-center text-brand-dark">나의 랭킹 데이터가 없습니다.</p>

  const handleOpenShareDialog = () => {
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <RankingCard
        activity={myRankingActivity}
        isMine
        variant="default"
        criteria={filters.criteria}
      />

      <div className="flex flex-col gap-[7px]">
        <OutlineButton text="랭킹 이미지 생성" onClick={handleOpenShareDialog} />
        <Caption text="* 이미지를 다운로드 후, 여러 SNS에 공유해보세요!" />
      </div>

      {isDialogOpen && (
        <ShareDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          initialImage={DEFAULT_SHARE_IMAGE}
          myRankingActivity={myRankingActivity}
          criteria={filters.criteria}
          district={filters.district}
          period={filters.period}
        />
      )}
    </div>
  )
}
