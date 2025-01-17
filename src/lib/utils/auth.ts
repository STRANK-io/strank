import { ErrorMessageCode } from '@/lib/constants/error'
import { NextResponse } from 'next/server'

/**
 * 오류 코드를 포함한 리다이렉션 응답을 생성하는 함수
 *
 * @param origin - 리다이렉션할 원본 URL
 * @param path - 리다이렉션할 경로
 * @param errorCode - 오류 코드
 * @returns {NextResponse} 리다이렉션 응답
 */
export const redirectWithError = (
  origin: string,
  path: string = '/',
  errorCode: ErrorMessageCode
) => {
  return NextResponse.redirect(`${origin}${path}?error=${errorCode}`)
}
