'use client'

import { useEffect } from 'react'
import { isIOS, isAndroid, isMobile } from 'react-device-detect'

// 다양한 인앱 브라우저 감지 함수
const detectInAppBrowser = () => {
  if (typeof window === 'undefined') return { isInApp: false, appName: null }

  const userAgent = window.navigator.userAgent.toLowerCase()

  // react-device-detect의 isMobile을 먼저 확인
  if (!isMobile) {
    return { isInApp: false, appName: null }
  }

  // 카카오톡 인앱 브라우저 감지
  if (/kakaotalk/i.test(userAgent)) {
    return { isInApp: true, appName: 'kakaotalk' }
  }

  // 인스타그램 인앱 브라우저 감지
  if (/instagram/i.test(userAgent)) {
    return { isInApp: true, appName: 'instagram' }
  }

  // 다른 브라우저는 모두 허용
  return { isInApp: false, appName: null }
}

// 외부 브라우저 열기 함수
const openExternalBrowser = (currentUrl: string, appName: string | null) => {
  if (typeof window === 'undefined') return

  // 이미 리다이렉트 시도했는지 확인 (무한 리다이렉트 방지)
  if (currentUrl.includes('redirected=true')) return

  // 리다이렉트 파라미터 추가
  const redirectUrl = currentUrl.includes('?')
    ? `${currentUrl}&redirected=true`
    : `${currentUrl}?redirected=true`

  // 인앱 브라우저 처리 로직
  switch (appName) {
    case 'kakaotalk':
      // 카카오톡 공식 외부 브라우저 호출 방식 사용
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(redirectUrl)}`
      break

    case 'instagram':
      if (isIOS) {
        // iOS 17 이상에서는 Safari 열기 (iOS 버전 확인 로직 추가 필요)
        window.location.href = `x-safari-${redirectUrl}`

        // 백업 방법: 일정 시간 후 일반 리다이렉트 시도
        setTimeout(() => {
          // 인스타그램 인앱브라우저에서 다운로드 속성 사용
          const link = document.createElement('a')
          link.href = redirectUrl
          link.target = '_blank'
          link.setAttribute('download', '')
          link.click()
        }, 500)
      } else if (isAndroid) {
        // 안드로이드에서는 intent 스킴 사용
        window.location.href = `intent://${redirectUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`

        setTimeout(() => {
          const link = document.createElement('a')
          link.href = redirectUrl
          link.target = '_blank'
          link.setAttribute('download', '')
          link.click()
        }, 500)
      }
      break

    default:
      // 다른 앱들은 처리하지 않음
      break
  }
}

export const InAppBrowserHandler = () => {
  useEffect(() => {
    const { isInApp, appName } = detectInAppBrowser()

    if (isInApp) {
      const currentUrl = window.location.href
      openExternalBrowser(currentUrl, appName)
    }
  }, [])

  return null
}
