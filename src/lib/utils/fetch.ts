import { logError } from './log'

export interface RetryFetchOptions extends RequestInit {
  retries?: number
  retryDelay?: number
  retryStatusCodes?: number[]
  onRetry?: (attempt: number, error: Error | null, response: Response | null) => void
}

/**
 * 네트워크 오류 발생 시 재시도 로직이 포함된 fetch 함수
 *
 * @param url - 요청할 URL
 * @param options - fetch 옵션 및 재시도 관련 설정
 * @returns fetch 응답
 */
export async function retryFetch(url: string, options: RetryFetchOptions = {}): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 1000,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    onRetry,
    ...fetchOptions
  } = options

  let lastError: Error | null = null
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions)

      // 성공적인 응답이거나 재시도하지 않을 상태 코드인 경우
      if (response.ok || !retryStatusCodes.includes(response.status)) {
        return response
      }

      lastResponse = response

      // 마지막 시도였다면 응답 반환
      if (attempt === retries) {
        return response
      }

      // 재시도 콜백 호출
      if (onRetry) {
        onRetry(attempt + 1, null, response)
      }

      // 재시도 전 대기 (지수 백오프 적용)
      const delay = retryDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    } catch (error) {
      lastError = error as Error

      // 마지막 시도였다면 에러 발생
      if (attempt === retries) {
        logError('Fetch retry failed', {
          url,
          attempts: attempt + 1,
          error: lastError,
        })
        throw error
      }

      // 재시도 콜백 호출
      if (onRetry) {
        onRetry(attempt + 1, error as Error, null)
      }

      // 재시도 전 대기 (지수 백오프 적용)
      const delay = retryDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // 이 코드는 실행되지 않아야 하지만, TypeScript 타입 체크를 위해 추가
  if (lastResponse) {
    return lastResponse
  }

  throw lastError || new Error('Unknown error during fetch retry')
}
