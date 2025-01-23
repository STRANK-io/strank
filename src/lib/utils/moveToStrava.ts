interface StravaUrls {
  appUrl: string
  webUrl: string
}

const getStravaUrls = (type: 'activity' | 'athlete', id: number): StravaUrls => {
  const path = type === 'activity' ? 'activities' : 'athletes'
  return {
    appUrl: `strava://${path}/${id}`,
    webUrl: `https://strava.com/${path}/${id}`,
  }
}

const handleStravaDeepLink = async (urls: StravaUrls) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('App launch timeout')), 2000)
  )

  try {
    await Promise.race([timeout, tryOpenStravaApp(urls.appUrl)])
  } catch (error) {
    // 앱 실행 실패 시 웹으로 이동
    openInNewTab(urls.webUrl)
  }
}

const tryOpenStravaApp = (appUrl: string): Promise<void> => {
  return new Promise(resolve => {
    const iframe = createHiddenIframe(appUrl)

    window.addEventListener('blur', () => {
      cleanupIframe(iframe)
      resolve()
    })

    // Cleanup iframe after timeout
    setTimeout(() => cleanupIframe(iframe), 2100)
  })
}

const createHiddenIframe = (url: string): HTMLIFrameElement => {
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = url
  document.body.appendChild(iframe)
  return iframe
}

const cleanupIframe = (iframe: HTMLIFrameElement) => {
  if (document.body.contains(iframe)) {
    document.body.removeChild(iframe)
  }
}

const openInNewTab = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export { getStravaUrls, handleStravaDeepLink, openInNewTab }
