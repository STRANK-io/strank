import { ERROR_CODES } from '@/lib/constants/error'
import { User, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import {
  isPrivatePath,
  isPublicPath,
  isPublicPathWithoutSync,
  ROUTES,
} from '@/lib/constants/routes'
import { Database, Tables } from '@/lib/supabase/supabase'
import { redirectWithError } from '@/lib/utils/auth'
import { logError } from '@/lib/utils/log'
import { updateSessionAndGetUser } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    const { supabaseNextResponse, supabase, sessionUser } = await updateSessionAndGetUser(request)

    const res = await handleAuthAndRouting({
      request,
      response: supabaseNextResponse,
      supabase,
      sessionUser,
    })

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
    '/((?!_next/static|_next/image|favicon.ico|api/strava/webhook|api/test|privacy-policy|google92ef127495fc8c64.html|.*\\.(?:png|jpg|jpeg|gif|ico)).*)',
  ],
}

// 인증 상태 확인 함수
async function checkAuthStatus(supabase: SupabaseClient<Database>, sessionUser: User | null) {
  if (!sessionUser) {
    return {
      isValid: false,
      user: null,
      sessionUser: null,
      error: ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
    }
  }

  // 유저 데이터 확인
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', sessionUser.id)
    .maybeSingle()

  return {
    isValid: !!user && !user.deleted_at,
    user,
    sessionUser: sessionUser,
    error: user?.deleted_at ? ERROR_CODES.AUTH.EXITED_USER : null,
  }
}

// 라우팅 규칙 적용 함수
async function handleRouting(
  request: NextRequest,
  supabase: SupabaseClient<Database>,
  sessionUser: User | null,
  user: Tables<'users'> | null
) {
  const path = request.nextUrl.pathname
  // 0. 가입 완료한 유저는 공개 페이지 접근 불가능 -> rankings 페이지로 이동
  if (user?.strava_connected_at && isPublicPathWithoutSync(path)) {
    return {
      shouldRedirect: true,
      response: NextResponse.redirect(new URL(ROUTES.PRIVATE.RANKINGS, request.url)),
    }
  }

  // 1. 홈페이지, auth/callback 로그인 없이 접근 가능 (auth/callback에서 세션 교환해서 그 이후에 세션이 생김)
  if (path === ROUTES.PUBLIC.HOME || path === ROUTES.PUBLIC.AUTH_CALLBACK) {
    return { shouldRedirect: false }
  }

  // 2. 탈퇴한 유저는 로그아웃 처리 후 홈으로
  if (user?.deleted_at) {
    await supabase.auth.signOut()
    return {
      shouldRedirect: true,
      response: redirectWithError(
        request.nextUrl.origin,
        ROUTES.PUBLIC.HOME,
        ERROR_CODES.AUTH.EXITED_USER
      ),
    }
  }

  // 3. 세션이 없으면 약관 페이지 이후로는 접근 불가능 -> 홈으로 리다이렉트
  if (!sessionUser) {
    return {
      shouldRedirect: true,
      response: redirectWithError(
        request.nextUrl.origin,
        ROUTES.PUBLIC.HOME,
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED
      ),
    }
  }

  // 4. 세션은 있고 유저 정보가 없는 경우 (구글 로그인 ~ 유저정보입력 완료 사이만 접근 가능)
  if (!user) {
    if (
      path === ROUTES.PUBLIC.AUTH_CALLBACK ||
      path === ROUTES.PUBLIC.TERMS ||
      path === ROUTES.PUBLIC.REGISTER_USER_INFO
    ) {
      return { shouldRedirect: false }
    }
    return {
      shouldRedirect: true,
      response: redirectWithError(
        request.nextUrl.origin,
        ROUTES.PUBLIC.HOME,
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED
      ),
    }
  }

  // 5. 스트라바 연동 안된 유저는 스트라바 활동 데이터 동기화 페이지 접근 불가능
  if (!user.strava_connected_at && path === ROUTES.PUBLIC.STRAVA_SYNC) {
    return {
      shouldRedirect: true,
      response: redirectWithError(
        request.nextUrl.origin,
        ROUTES.PUBLIC.STRAVA_CONNECT,
        ERROR_CODES.AUTH.STRAVA_CONNECTION_REQUIRED
      ),
    }
  }

  // 6. 스트라바 연동 안된 유저는 비공개 페이지 접근 불가능
  if (!user.strava_connected_at && isPrivatePath(path)) {
    return {
      shouldRedirect: true,
      response: redirectWithError(
        request.nextUrl.origin,
        ROUTES.PUBLIC.HOME,
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED
      ),
    }
  }

  return { shouldRedirect: false }
}

export async function handleAuthAndRouting({
  request,
  response,
  supabase,
  sessionUser,
}: {
  request: NextRequest
  response: NextResponse
  supabase: SupabaseClient<Database>
  sessionUser: User | null
}) {
  try {
    // 인증 상태 확인
    const authStatus = await checkAuthStatus(supabase, sessionUser)

    // 라우팅 규칙 적용
    const routingResult = await handleRouting(
      request,
      supabase,
      authStatus.sessionUser,
      authStatus.user
    )
    if (routingResult.shouldRedirect) {
      return routingResult.response
    }

    if (authStatus.user) {
      response.headers.set('x-user-id', authStatus.user?.id)
    }

    return response
  } catch (error) {
    logError('Middleware Error:', {
      error,
      functionName: 'handleAuthAndRouting',
    })
    return redirectWithError(request.nextUrl.origin, ROUTES.PUBLIC.HOME, ERROR_CODES.INTERNAL_ERROR)
  }
}
