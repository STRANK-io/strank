import { ErrorMessageCode } from '@/lib/constants/error'
import { NextResponse } from 'next/server'

export const redirectWithError = (
  origin: string,
  path: string = '/',
  errorCode: ErrorMessageCode
) => {
  return NextResponse.redirect(`${origin}${path}?error=${errorCode}`)
}
