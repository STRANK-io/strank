import { createServerClient } from '@supabase/ssr'
import { Session, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicPath, ROUTES } from '@/lib/constants/routes'
import { ERROR_CODES } from '@/lib/constants/error'
import { Database, Tables } from '@/lib/supabase/supabase'

// TODO: 로그인 기능 전체 구현 후 하나씩 테스트 필요
export async function createClient(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient<Database>(
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

  return { supabase, response }
}

// 로그아웃 처리 함수
async function handleLogout(request: NextRequest) {
  const { supabase } = await createClient(request)
  await supabase.auth.signOut()
}

// 인증 상태 확인 함수
async function checkAuthStatus(supabase: SupabaseClient<Database>) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      isValid: false,
      user: null,
      session: null,
      error: ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
    }
  }

  // 유저 데이터 확인
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  return {
    isValid: !!user && !user.deleted_at,
    user,
    session,
    error: user?.deleted_at ? ERROR_CODES.AUTH.EXITED_USER : null,
  }
}

// 라우팅 규칙 적용 함수
async function handleRouting(
  request: NextRequest,
  session: Session | null,
  user: Tables<'users'> | null
) {
  const path = request.nextUrl.pathname

  // 0. 로그인한 유저는 공개 페이지 접근 불가능 -> 원래 있던 페이지로 이동 (//TODO: 동작 확인 필요)
  if (user?.strava_connected_at && isPublicPath(path)) {
    return {
      shouldRedirect: true,
      response: NextResponse.redirect(new URL(path, request.url)),
    }
  }

  // 1. 홈페이지, auth/callback 로그인 없이 접근 가능 (auth/callback에서 세션 교환해서 그 이후에 세션이 생김)
  if (path === ROUTES.PUBLIC.HOME || path === ROUTES.PUBLIC.AUTH_CALLBACK) {
    return { shouldRedirect: false }
  }

  // 2. 탈퇴한 유저는 로그아웃 처리 후 홈으로
  if (user?.deleted_at) {
    await handleLogout(request)
    return {
      shouldRedirect: true,
      response: NextResponse.redirect(
        new URL(`/?error=${ERROR_CODES.AUTH.EXITED_USER}`, request.url)
      ),
    }
  }

  // 3. 세션이 없으면 약관 페이지 이후로는 접근 불가능 -> 홈으로 리다이렉트
  if (!session) {
    return {
      shouldRedirect: true,
      response: NextResponse.redirect(
        new URL(`/?error=${ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED}`, request.url)
      ),
    }
  }

  // 4. 세션은 있고 유저 정보가 없는 경우 (구글 로그인만 하고 유저 정보 입력 안 함) -> 구글 로그인 ~ 유저 정보 등록 페이지 사이에만 접근 가능
  if (!user) {
    if (
      path === ROUTES.PUBLIC.AUTH_CALLBACK ||
      path === ROUTES.PUBLIC.TERMS ||
      path === ROUTES.PUBLIC.STRAVA_CONNECT ||
      path === ROUTES.PUBLIC.REGISTER_USER_INFO
    ) {
      return { shouldRedirect: false }
    }
    return {
      shouldRedirect: true,
      response: NextResponse.redirect(
        new URL(`/?error=${ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED}`, request.url)
      ),
    }
  }

  // 5. 스트라바 미연동 -> 연동 관련 페이지만 접근 가능
  if (!user.strava_connected_at) {
    if (
      path === ROUTES.PUBLIC.STRAVA_CONNECT ||
      path === ROUTES.PUBLIC.REGISTER_USER_INFO ||
      path === ROUTES.PUBLIC.STRAVA_SYNC
    ) {
      return { shouldRedirect: false }
    }
    return {
      shouldRedirect: true,
      response: NextResponse.redirect(
        new URL(`/?error=${ERROR_CODES.AUTH.STRAVA_CONNECTION_REQUIRED}`, request.url)
      ),
    }
  }

  // 6. 인증 완료된 유저는 퍼블릭 페이지 접근시 rankings로 리다이렉트
  if (isPublicPath(path)) {
    return {
      shouldRedirect: true,
      response: NextResponse.redirect(new URL(ROUTES.PRIVATE.RANKINGS, request.url)),
    }
  }

  return { shouldRedirect: false }
}

export async function handleAuthAndRouting(request: NextRequest) {
  try {
    const { supabase, response } = await createClient(request)

    // 인증 상태 확인
    const authStatus = await checkAuthStatus(supabase)

    // 라우팅 규칙 적용
    const routingResult = await handleRouting(request, authStatus.session, authStatus.user)
    if (routingResult.shouldRedirect) {
      return routingResult.response
    }

    return response
  } catch (error) {
    console.error('Middleware Error:', error)
    return NextResponse.redirect(new URL(`/?error=${ERROR_CODES.INTERNAL_ERROR}`, request.url))
  }
}
