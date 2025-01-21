'use client'

import Image from 'next/image'

interface StravaLogoButtonProps {
  type: 'activity' | 'athlete'
  id: number
}

export default function StravaLogoButton({ type, id }: StravaLogoButtonProps) {
  const handleClickStravaLogo = () => {
    if (type === 'activity') {
      window.open(`https://www.strava.com/activities/${id}`, '_blank')
    } else {
      window.open(`https://www.strava.com/athletes/${id}`, '_blank')
    }
  }

  return (
    <Image
      src="/images/strava-logo.png"
      role="button"
      alt="Strank Logo"
      width={24}
      height={24}
      className="cursor-pointer object-contain"
      priority
      onClick={handleClickStravaLogo}
    />
  )
}
