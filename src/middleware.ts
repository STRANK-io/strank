import { ERROR_CODES } from '@/lib/constants/error'
import { handleAuthAndRouting } from '@/lib/supabase/middleware'
import { logError } from '@/lib/utils/log'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/lib/supabase/supabase'

const createMiddlewareClient = (request: NextRequest, response: NextResponse) => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: cookiesToSet => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )
}

export async function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next()
    const supabase = createMiddlewareClient(request, response)

    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser()

    const res = await handleAuthAndRouting(request, response, supabase, sessionUser)
    return res
  } catch (error) {
    logError('Middleware Error:', {
      error,
      functionName: 'middleware',
    })
    return NextResponse.redirect(new URL(`/?error=${ERROR_CODES.INTERNAL_ERROR}`, request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/strava/webhook|.*\\.(?:png|jpg|jpeg|gif|ico)).*)',
  ],
}
