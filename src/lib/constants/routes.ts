export const ROUTES = {
  PUBLIC: {
    HOME: '/', // 랜딩 페이지
    AUTH_CALLBACK: '/auth/callback', // 인증 콜백 페이지
    TERMS: '/terms', // 약관 동의 페이지
    REGISTER_USER_INFO: '/register-user-info', // 유저 정보 등록 페이지
    STRAVA_CONNECT: '/strava-connect', // 스트라바 연동 페이지
    STRAVA_SYNC: '/strava-sync', // 스트라바 연동 페이지
  },
  PRIVATE: {
    RANKINGS: '/rankings',
    REPORT: '/report',
    TIMELINE: '/timeline',
    MYPAGE: '/mypage',
  },
} as const

export const PUBLIC_PATHS = Object.values(ROUTES.PUBLIC)
export const PRIVATE_PATHS = Object.values(ROUTES.PRIVATE)

export const isPublicPath = (path: string): boolean => {
  return PUBLIC_PATHS.some(publicPath =>
    publicPath === '/' ? path === '/' : path.startsWith(publicPath)
  )
}

export const isPrivatePath = (path: string): boolean => {
  return PRIVATE_PATHS.some(privatePath => path.startsWith(privatePath))
}
