export const ERROR_CODES = {
  AUTH: {
    SESSION_EXPIRED: 'session_expired',
    AUTH_CALLBACK_ERROR: 'auth_callback_error',
    LOGIN_FAILED: 'login_failed',
    AUTHENTICATION_REQUIRED: 'authentication_required',
    EXITED_USER: 'exited_user',
    BETA_TESTER_RECRUITMENT_CLOSED: 'beta_tester_recruitment_closed',
    STRAVA_CONNECTION_REQUIRED: 'strava_connection_required',
    IMAGE_PROCESSING_FAILED: 'image_processing_failed',
    IMAGE_UPLOAD_FAILED: 'image_upload_failed',
    STRAVA_CONNECTION_FAILED: 'strava_connection_failed',
    STRAVA_CONNECTION_FAILED_ALREADY_CONNECTED: 'strava_connection_failed_already_connected',
    WITHDRAWAL_FAILED: 'withdrawal_failed',
    LOGOUT_FAILED: 'logout_failed',
  },
  STRAVA: {
    API_LIMIT_EXCEEDED: 'strava_api_limit_exceeded',
    ACTIVITY_UPDATE_FAILED: 'strava_activity_update_failed',
    ACTIVITY_SYNC_FAILED: 'strava_activity_sync_failed',
    INSUFFICIENT_PERMISSIONS: 'strava_insufficient_permissions',
    TOKEN_EXPIRED: 'strava_token_expired',
    TOKEN_REFRESH_FAILED: 'strava_token_refresh_failed',
    NETWORK_ERROR: 'strava_network_error',
    CONNECTION_ABORTED: 'strava_connection_aborted',
  },
  NETWORK: {
    CONNECTION_TIMEOUT: 'network_connection_timeout',
    CONNECTION_LOST: 'network_connection_lost',
    REQUEST_FAILED: 'network_request_failed',
  },
  OPENAI: {
    API_ERROR: 'openai_api_error',
    API_LIMIT_EXCEEDED: 'openai_api_limit_exceeded',
    DESCRIPTION_GENERATION_FAILED: 'openai_description_generation_failed',
  },
  INTERNAL_ERROR: 'internal_error',
} as const

export const ERROR_MESSAGES = {
  // AUTH
  [ERROR_CODES.AUTH.EXITED_USER]:
    '탈퇴한 회원이라 사용이 불가합니다.\n필요한 경우, support@strank.io로 문의주세요!',
  [ERROR_CODES.AUTH.WITHDRAWAL_FAILED]: '회원탈퇴에 실패하였습니다. 다시 시도해주세요.',
  [ERROR_CODES.AUTH.LOGOUT_FAILED]: '로그아웃에 실패하였습니다. 다시 시도해주세요.',
  [ERROR_CODES.AUTH.SESSION_EXPIRED]: '세션이 만료되었습니다. 다시 로그인해주세요.',
  [ERROR_CODES.AUTH.LOGIN_FAILED]: '로그인에 실패했습니다. 다시 시도해주세요.',
  [ERROR_CODES.AUTH.AUTH_CALLBACK_ERROR]: '인증 중 오류가 발생했습니다.',
  [ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED]: '인증이 필요한 페이지입니다. 로그인 후 이용해주세요.',
  [ERROR_CODES.AUTH.STRAVA_CONNECTION_REQUIRED]: 'Strava 계정 연동이 필요합니다.',
  [ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED]:
    '스트라바 계정 연결에 문제가 발생하였습니다.\n다시 한번 시도해주세요. 지속적으로 문제가 발생하는 경우 support@strank.io 로 문의주세요.',
  [ERROR_CODES.AUTH.STRAVA_CONNECTION_FAILED_ALREADY_CONNECTED]:
    '이미 연동된 스트라바 계정입니다.\n동일한 스트라바 계정은 연동할 수 없습니다.',
  [ERROR_CODES.AUTH.BETA_TESTER_RECRUITMENT_CLOSED]:
    '아쉽게도 베타 테스터 모집이 마감되었습니다.\n다음 모집 회차에 참여해주세요!',
  [ERROR_CODES.AUTH.IMAGE_UPLOAD_FAILED]: '프로필 이미지 업로드에 실패했습니다. 다시 시도해주세요.',
  [ERROR_CODES.AUTH.IMAGE_PROCESSING_FAILED]:
    '프로필 이미지 처리에 실패했습니다. 다시 시도해주세요.',

  // STRAVA
  [ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED]:
    'Strava API 일일 사용량을 초과했습니다. 잠시 후 다시 시도해주세요.',
  [ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED]: '활동 업데이트에 실패했습니다. 다시 시도해주세요.',
  [ERROR_CODES.STRAVA.ACTIVITY_SYNC_FAILED]: '활동 동기화에 실패했습니다. 다시 시도해주세요.',
  [ERROR_CODES.STRAVA.INSUFFICIENT_PERMISSIONS]:
    '원활한 서비스 이용을 위해 스트라바 계정 연동 시 필요한 모든 권한을 허용해주세요.',
  [ERROR_CODES.STRAVA.TOKEN_EXPIRED]: '스트라바 인증이 만료되었습니다. 다시 연동해주세요.',
  [ERROR_CODES.STRAVA.TOKEN_REFRESH_FAILED]:
    '스트라바 인증 갱신에 실패했습니다. 다시 연동해주세요.',
  [ERROR_CODES.STRAVA.NETWORK_ERROR]:
    '스트라바 서버와 통신 중 오류가 발생했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.',
  [ERROR_CODES.STRAVA.CONNECTION_ABORTED]:
    '스트라바 연동 과정이 중단되었습니다. 처음부터 다시 시도해주세요.',

  // NETWORK
  [ERROR_CODES.NETWORK.CONNECTION_TIMEOUT]:
    '서버 연결 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.',
  [ERROR_CODES.NETWORK.CONNECTION_LOST]:
    '네트워크 연결이 끊어졌습니다. 연결 상태를 확인하고 다시 시도해주세요.',
  [ERROR_CODES.NETWORK.REQUEST_FAILED]: '네트워크 요청이 실패했습니다. 다시 시도해주세요.',

  // INTERNAL
  [ERROR_CODES.INTERNAL_ERROR]: '시스템 오류가 발생했습니다. 다시 시도해주세요.',
} as const

export type ErrorMessageCode = keyof typeof ERROR_MESSAGES
