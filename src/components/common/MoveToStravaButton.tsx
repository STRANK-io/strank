'use client'

import Image from 'next/image'
import { isMobile } from 'react-device-detect'
import { logError } from '@/lib/utils/log'
import { getStravaUrls, handleStravaDeepLink, openInNewTab } from '@/lib/utils/moveToStrava'

interface MoveToStravaButtonProps {
  type: 'activity' | 'athlete'
  id: number
}

export const MoveToStravaButton = ({ type, id }: MoveToStravaButtonProps) => {
  const handleClickStravaLogo = async () => {
    const urls = getStravaUrls(type, id)

    try {
      if (isMobile) {
        await handleStravaDeepLink(urls)
      } else {
        openInNewTab(urls.webUrl)
      }
    } catch (error) {
      logError(error as string, {
        message: 'Error while handling Strava deep link',
        functionName: 'handleClickStravaLogo',
      })
      openInNewTab(urls.webUrl)
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
