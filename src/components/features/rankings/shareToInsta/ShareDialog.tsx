'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ActivityWithRanking, RankingFilters } from '@/lib/types/ranking'
import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { convertAndCropToSquare } from '@/lib/utils/image'
import { X } from 'lucide-react'
import SharePreview from '@/components/features/rankings/shareToInsta/SharePreview'
import OutlineButton from '@/components/common/OutlineButton'
import { Caption } from '@/components/common/Caption'
import { isMobile } from 'react-device-detect'

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  criteria: RankingFilters['criteria']
  period: RankingFilters['period']
  district: RankingFilters['district']
  initialImage: string
  myRankingActivity: ActivityWithRanking
}

export default function ShareDialog({
  isOpen,
  onClose,
  criteria,
  period,
  district,
  initialImage,
  myRankingActivity,
}: ShareDialogProps) {
  const [backgroundImage, setBackgroundImage] = useState(initialImage)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownload = async () => {
    if (typeof window === 'undefined') return // window가 없는 환경에서는 실행 안 함

    const previewElement = document.querySelector('[data-share-preview="true"]') as HTMLElement
    if (!previewElement) {
      showToastError('공유할 이미지를 생성할 수 없습니다.')
      return
    }

    try {
      const blob = await generateShareImage(previewElement)
      if (isMobile) {
        await handleMobileDownload(blob)
      } else {
        await handleDefaultDownload(blob)
      }
      onClose()
    } catch (error) {
      showToastError('이미지 저장에 실패했습니다.', error)
    }
  }

  const showToastError = (message: string, _error?: unknown) => {
    toast(<ToastContent text={message} />)
  }

  const generateShareImage = async (previewElement: HTMLElement) => {
    const { canvas, ctx } = createCanvas()

    // 배경 이미지 로드 및 그리기
    const bgImage = await loadImage(backgroundImage)
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height)

    // 오버레이 그리기
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // HTML 요소를 이미지로 변환
    const dataUrl = await toPng(previewElement, { quality: 1.0, pixelRatio: 3 })

    // 오버레이 이미지 로드 및 그리기
    const overlayImage = await loadImage(dataUrl)
    ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height)

    // Canvas를 Blob으로 변환
    return new Promise<Blob>(resolve => {
      canvas.toBlob(
        blob => {
          resolve(blob as Blob)
        },
        'image/png',
        1.0
      )
    })
  }

  const loadImage = async (src: string): Promise<HTMLImageElement> => {
    const image = new Image()
    image.crossOrigin = 'anonymous'

    return new Promise((resolve, reject) => {
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })
  }

  const createCanvas = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Canvas 크기 설정 (고해상도를 위해 3배 크기)
    canvas.width = 305 * 3
    canvas.height = 305 * 3

    return { canvas, ctx }
  }

  const handleMobileDownload = async (blob: Blob) => {
    const file = new File([blob], 'strank-share.png', { type: 'image/png' })

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: '나의 라이딩 기록',
        })
        toast(<ToastContent text="이미지가 저장되었습니다." />)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          throw error
        }
      }
    } else {
      // Web Share API를 지원하지 않는 경우 일반 다운로드
      await handleDefaultDownload(blob)
    }
  }

  const handleDefaultDownload = async (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'strank-share.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast(<ToastContent text="이미지가 저장되었습니다." />)
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof window === 'undefined') return

    const file = e.target.files?.[0]
    if (!file) return

    try {
      const processedImage = await convertAndCropToSquare(file)
      setBackgroundImage(processedImage)
    } catch (error) {
      showToastError('이미지 처리 중 오류가 발생했습니다.', error)
    }
  }

  const handleImageChange = () => {
    fileInputRef.current?.click()
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
          className="flex h-fit w-full max-w-[353px] flex-col gap-[16px] rounded-3xl bg-white p-6"
          hideCloseButton
          aria-describedby={undefined}
        >
          <DialogTitle asChild>
            <VisuallyHidden>나의 랭킹 공유</VisuallyHidden>
          </DialogTitle>

          <SharePreview
            backgroundImage={backgroundImage}
            myRankingActivity={myRankingActivity}
            criteriaFilter={criteria}
            periodFilter={period}
            districtFilter={district}
          />

          <div className="flex flex-col gap-[7px]">
            <div className="flex gap-4">
              <OutlineButton text="배경 이미지 변경" onClick={handleImageChange} />
              <OutlineButton text="이미지 다운로드" onClick={handleDownload} />
            </div>
            <Caption text="* 이미지를 다운로드 후, 여러 SNS에 공유해보세요!" />
          </div>
        </DialogContent>
      </Dialog>

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
