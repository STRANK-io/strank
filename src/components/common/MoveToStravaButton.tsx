'use client'

import { isMobile } from 'react-device-detect'
import { logError } from '@/lib/utils/log'
import { getStravaUrls, handleStravaDeepLink, openInNewTab } from '@/lib/utils/moveToStrava'
import StravaLogo from '@/components/common/logos/StravaLogo'

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
    <button onClick={handleClickStravaLogo} className="h-6 w-6">
      <StravaLogo className="h-full w-full" />
    </button>
  )
}
