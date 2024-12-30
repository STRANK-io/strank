import { ERROR_CODES } from '@/lib/constants/error'
import { handleAuthAndRouting } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    const res = await handleAuthAndRouting(request)
    return res
  } catch (error) {
    console.error('Middleware Error:', error)
    return NextResponse.redirect(new URL(`/?error=${ERROR_CODES.INTERNAL_ERROR}`, request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|ico)).*)'],
}
