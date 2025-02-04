'use client'

import { cn } from '@/lib/utils/cn'
import Image from 'next/image'
import { DefaultUserIcon } from '@/components/common/icons/DefaultUserIcon'

interface ProfileImageProps {
  imageUrl: string | null
  size: number
  className?: string
}

export const ProfileImage = ({ imageUrl, size, className }: ProfileImageProps) => {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-full bg-white',
        className
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="User Profile Image"
          fill
          sizes={`${size}px`}
          className="object-cover"
          priority
        />
      ) : (
        <DefaultUserIcon width={size} height={size} />
      )}
    </div>
  )
}
