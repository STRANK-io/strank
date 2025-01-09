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

      // base64 데이터를 Blob으로 변환
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'strank-share.png', { type: 'image/png' })

      // 이미지를 앨범에 저장
      const imageUrl = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = imageUrl
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(imageUrl)

      // 플랫폼별 인스타그램 공유 URL
      const instagramUrl = navigator.userAgent.match(/iphone|ipod|ipad/i)
        ? 'instagram://share-sheet?source_application=strank'
        : 'intent:#Intent;type=image/*;package=com.instagram.android;action=com.instagram.share.ADD_TO_FEED;end'

      // 잠시 대기 후 인스타그램 공유 화면으로 이동
      setTimeout(() => {
        window.location.href = instagramUrl
      }, 1500)

      // 인스타그램 앱이 없는 경우를 위한 타임아웃
      setTimeout(() => {
        window.location.href = 'https://www.instagram.com'
      }, 3000)

      toast(<ToastContent text="이미지가 갤러리에 저장되었습니다." />)
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
