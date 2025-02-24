'use client'

import { useEffect } from 'react'

const isKakaoInAppBrowser = () => {
  if (typeof window === 'undefined') return false

  const userAgent = window.navigator.userAgent.toLowerCase()
  return /kakaotalk/i.test(userAgent)
}

const openExternalBrowser = (currentUrl: string) => {
  if (typeof window === 'undefined') return

  // 카카오톡 공식 외부 브라우저 호출 방식 사용
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`
}

export const KakaoInAppBrowserHandler = () => {
  useEffect(() => {
    if (isKakaoInAppBrowser()) {
      const currentUrl = window.location.href
      openExternalBrowser(currentUrl)
    }
  }, [])

  return null
}
