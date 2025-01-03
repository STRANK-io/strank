'use client'

import { ChangeEvent, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { User } from 'lucide-react'

interface ProfileImageProps {
  imageUrl: string | null
  onImageChange: (file: File) => void
  buttonText: string
}

export const ProfileImage = ({ imageUrl, onImageChange, buttonText }: ProfileImageProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    onImageChange(file)
  }

  return (
    <>
      <input
        type="file"
        accept={'image/*,.heic,.heif'}
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageChange}
      />

      <div className={cn('flex w-full flex-col items-center justify-center gap-3')}>
        <div
          className={cn(
            'flex h-[94px] w-[94px] items-center justify-center overflow-hidden rounded-full bg-white',
            imageUrl ? 'bg-white' : 'bg-[#FFD7A1]'
          )}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <User className={cn('h-[55px] w-[55px] fill-brand-secondary text-transparent')} />
          )}
        </div>

        <Button
          size={null}
          className={cn(
            'rounded-full bg-[#F3F3F3] px-4 py-[5.5px]',
            'text-xs font-bold leading-[14.32px] text-brand-dark',
            'hover:bg-[#F3F3F3] hover:text-brand-dark'
          )}
          onClick={handleImageClick}
        >
          {buttonText}
        </Button>
      </div>
    </>
  )
}
