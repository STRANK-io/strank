export interface LogContext {
  // 시스템 및 환경 정보
  timestamp?: string // 로그 발생 시간 (자동 생성 가능)
  currentEnv?: string // 현재 실행 환경 (예: "development", "production")
  expectedEnv?: string // 예상 실행 환경

  // 사용자 및 요청 관련 정보
  userId?: string | number // 사용자 ID
  username?: string // 사용자 이름
  sessionId?: string // 세션 ID
  ipAddress?: string // 요청한 IP 주소

  // API 및 에러 관련 정보
  endpoint?: string // API 요청 엔드포인트
  statusCode?: number // HTTP 상태 코드
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' // HTTP 메서드
  requestId?: string // 요청 추적 ID (예: UUID)
  errorCode?: string // 에러 코드 (커스텀 코드)

  // 디버깅 정보
  debugInfo?: Record<string, any> // 임의의 디버깅 정보
  stackTrace?: string // 스택 트레이스 (자동 생성 가능)
  additionalInfo?: Record<string, any> // 기타 추가 정보

  // 확장 가능성을 위한 필드
  [key: string]: any // 기타 임의의 필드
}
