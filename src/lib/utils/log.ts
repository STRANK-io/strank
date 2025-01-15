import { LogContext } from '@/lib/types/log'

/**
 * 에러 로깅을 위한 유틸리티 함수
 *
 * @example
 * logError('An error occurred', { userId: 123, endpoint: '/api/users' })
 *
 * @param message - 에러 메시지
 * @param context - 추가적인 컨텍스트 정보
 */
export const logError = (message: string, context: LogContext = {}) => {
  const timestamp = new Date().toISOString()
  const errorLocation = new Error().stack?.split('\n')[2]?.trim() // 호출 위치 추출

  console.error(`[Error] ${timestamp} - ${message}`, {
    timestamp,
    location: errorLocation,
    ...context,
  })
}
