'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ActivityWithRanking, RankingFilters } from '@/lib/types/ranking'
import { useState, useRef } from 'react'
import SharePreview from './SharePreview'
import { toPng } from 'html-to-image'
import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import OutlineButton from '@/components/features/rankings/shareToInsta/OutlineButton'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { convertAndCropToSquare } from '@/lib/utils/image'
import { X } from 'lucide-react'

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  criteria: RankingFilters['criteria']
  initialImage: string
  myRankingActivity: ActivityWithRanking
}

export default function ShareDialog({
  isOpen,
  onClose,
  criteria,
  initialImage,
  myRankingActivity,
}: ShareDialogProps) {
  const [backgroundImage, setBackgroundImage] = useState(initialImage)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const processedImage = await convertAndCropToSquare(file)
      setBackgroundImage(processedImage)
    } catch (error) {
      console.error('Error processing image:', error)
      toast(<ToastContent text="이미지 처리 중 오류가 발생했습니다." />)
    }
  }

  const handleImageChange = () => {
    fileInputRef.current?.click()
  }

  const handleShare = async () => {
    try {
      // 이미지 생성
      const previewElement = document.querySelector('[data-preview="true"]') as HTMLElement
      if (!previewElement) return

      const dataUrl = await toPng(previewElement)
      const blob = await fetch(dataUrl).then(r => r.blob())
      const file = new File([blob], 'strank-share.png', { type: 'image/png' })

      if ('share' in navigator && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: '나의 라이딩 기록',
          })

          // 공유 완료 후 인스타그램으로 이동
          setTimeout(() => {
            const instagramUrl = navigator.userAgent.match(/iphone|ipod|ipad/i)
              ? 'instagram://share-sheet?source_application=strank'
              : 'intent:#Intent;type=image/*;package=com.instagram.android;action=com.instagram.share.ADD_TO_FEED;end'
            window.location.href = instagramUrl
          }, 1000)
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error('Share failed:', err)
            toast(<ToastContent text="이미지 공유에 실패했습니다." />)
          }
        }
      } else {
        toast(<ToastContent text="이 브라우저에서는 이미지 공유가 지원되지 않습니다." />)
      }

      // 인스타그램 앱이 없는 경우를 위한 타임아웃
      setTimeout(() => {
        window.location.href = 'https://www.instagram.com'
      }, 3000)
    } catch (error) {
      console.error('Error sharing to Instagram:', error)
      toast(<ToastContent text="이미지 공유 중 오류가 발생했습니다." />)
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,.heic,.heif"
        onChange={handleImageSelect}
      />

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="flex h-fit w-full max-w-[353px] flex-col gap-6 rounded-3xl bg-white p-6"
          hideCloseButton
          aria-describedby={undefined}
        >
          <DialogTitle asChild>
            <VisuallyHidden>나의 랭킹 공유</VisuallyHidden>
          </DialogTitle>

          <div data-preview="true">
            <SharePreview
              backgroundImage={backgroundImage}
              myRankingActivity={myRankingActivity}
              criteria={criteria}
            />
          </div>

          <div className="flex gap-4">
            <OutlineButton text="Instagram 공유" onClick={handleShare} />
            <OutlineButton text="이미지 변경" onClick={handleImageChange} />
          </div>
        </DialogContent>
      </Dialog>

      {/* X 버튼 */}
      {isOpen && (
        <div className="fixed left-0 top-0 z-[51] h-full w-full">
          <button
            onClick={onClose}
            className="absolute left-1/2 top-[calc(50%+210px)] flex -translate-x-1/2 items-center justify-center rounded-full"
          >
            <X className="h-[35px] w-[35px] text-white" />
          </button>
        </div>
      )}
    </>
  )
}
