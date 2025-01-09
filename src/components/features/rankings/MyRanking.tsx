import { useSearchParams } from 'next/navigation'
import { useMyRanking } from '@/hooks/activities/api/useMyRanking'
import { RankingCard } from '@/components/features/rankings/RankingCard'
import { RankingFilters } from '@/lib/types/ranking'
import ShareDialog from '@/components/features/rankings/ShareDialog'
import { useState, useRef } from 'react'
import { isMobile } from 'react-device-detect'
import OutlineButton from '@/components/features/rankings/shareToInsta/OutlineButton'
import { convertAndCropToSquare } from '@/lib/utils/image'
import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'

const DEFAULT_SHARE_IMAGE = '/images/strank-vertical-logo.png'

export default function MyRanking() {
  const searchParams = useSearchParams()
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [shareInitialImage, setShareInitialImage] = useState<string>(DEFAULT_SHARE_IMAGE)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filters: RankingFilters = {
    criteria: (searchParams.get('criteria') as RankingFilters['criteria']) || 'distance',
    district: (searchParams.get('district') as RankingFilters['district']) || 'all',
    period: (searchParams.get('period') as RankingFilters['period']) || 'lastweek',
  }

  const { data: myRankingActivity } = useMyRanking(filters)

  if (!myRankingActivity)
    return <p className="text-center text-brand-dark">나의 랭킹 데이터가 없습니다.</p>

  const handleOpenShareDialog = (initialImage: string) => {
    setShareInitialImage(initialImage)
    setIsShareDialogOpen(true)
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const processedImage = await convertAndCropToSquare(file)
      handleOpenShareDialog(processedImage)
    } catch (error) {
      console.error('Error ranking page processing image:', error)
      toast(<ToastContent text="이미지 처리 중 오류가 발생했습니다." />)
    }
  }

  const handleShareToInsta = () => {
    if (!isMobile) {
      toast(<ToastContent text="해당 기능은 모바일에서만 사용 가능합니다." />)
      return
    }

    handleOpenShareDialog(DEFAULT_SHARE_IMAGE)
  }

  const handleImageUpload = () => {
    if (!isMobile) {
      toast(<ToastContent text="해당 기능은 모바일에서만 사용 가능합니다." />)
      return
    }

    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,.heic,.heif"
        onChange={handleImageSelect}
      />

      <RankingCard
        activity={myRankingActivity}
        isMine
        variant="default"
        criteria={filters.criteria}
      />

      <div className="flex gap-2">
        <OutlineButton text="Instagram 공유" onClick={handleShareToInsta} />
        <OutlineButton text="이미지 업로드" onClick={handleImageUpload} />
      </div>

      {isShareDialogOpen && (
        <ShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          initialImage={shareInitialImage}
          myRankingActivity={myRankingActivity}
          criteria={filters.criteria}
        />
      )}
    </div>
  )
}
