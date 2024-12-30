export const ERROR_CODES = {
  AUTH: {
    SESSION_EXPIRED: 'session_expired',
    AUTH_CALLBACK_ERROR: 'auth_callback_error',
    LOGIN_FAILED: 'login_failed',
    AUTHENTICATION_REQUIRED: 'authentication_required',
    EXITED_USER: 'exited_user',
    BETA_TESTER_RECRUITMENT_CLOSED: 'beta_tester_recruitment_closed',
    STRAVA_CONNECTION_REQUIRED: 'strava_connection_required',
  },
  INTERNAL_ERROR: 'internal_error',
} as const

// TODO: 에러 메세지 컨펌 받기
export const ERROR_MESSAGES = {
  [ERROR_CODES.AUTH.SESSION_EXPIRED]: '세션이 만료되었습니다. 다시 로그인해주세요.',
  [ERROR_CODES.AUTH.AUTH_CALLBACK_ERROR]: '인증 중 오류가 발생했습니다.',
  [ERROR_CODES.AUTH.LOGIN_FAILED]: '로그인에 실패했습니다. 다시 시도해주세요.',
  [ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED]: '인증이 필요한 페이지입니다. 로그인 후 이용해주세요.',
  [ERROR_CODES.AUTH.EXITED_USER]: '탈퇴한 회원입니다.',
  [ERROR_CODES.AUTH.BETA_TESTER_RECRUITMENT_CLOSED]:
    '아쉽게도 베타 테스터 모집이 마감되었습니다.\n다음 모집 회차에 참여해주세요!',
  [ERROR_CODES.AUTH.STRAVA_CONNECTION_REQUIRED]: 'Strava 계정 연동이 필요합니다.',
  [ERROR_CODES.INTERNAL_ERROR]: '시스템 오류가 발생했습니다. 다시 시도해주세요.',
} as const

export type ErrorMessageCode = keyof typeof ERROR_MESSAGES
