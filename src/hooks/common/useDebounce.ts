import { useCallback, useRef, useEffect } from 'react'

export function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number = 300) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // 콜백 함수 레퍼런스 업데이트
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // 클린업
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  )
}
