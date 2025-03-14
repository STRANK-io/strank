import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/supabase'
import { redirectWithError } from '@/lib/utils/auth'
import { logError } from '@/lib/utils/log'

/**
 * 현재 활성화된 유저 수(userCountData)와 수용 가능한 유저 수(userCapacityData)를 확인하여 가입 가능 여부를 반환하는 함수
 */
const checkUserCapacity = async (supabase: SupabaseClient<Database>) => {
  const { data: userCountData, error: userCountError } = await supabase
    .from('user_count')
    .select('total_users')
    .single()

  const { data: userCapacityData, error: userCapacityError } = await supabase
    .from('user_capacity')
    .select('max_users')
    .single()

  if (userCountError || userCapacityError || !userCountData || !userCapacityData) {
    if (userCountError) {
      logError('Failed to check user count:', { userCountError, functionName: 'checkUserCapacity' })
    }
    if (userCapacityError) {
      logError('Failed to check user capacity:', {
        userCapacityError,
        functionName: 'checkUserCapacity',
      })
    }

    return { error: true }
  }

  const totalUsers = userCountData.total_users || 0
  const maxUsers = userCapacityData.max_users || 0

  return { error: false, hasCapacity: totalUsers < maxUsers }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return redirectWithError(origin, ROUTES.PUBLIC.HOME, ERROR_CODES.AUTH.AUTH_CALLBACK_ERROR)
  }

  const supabase = await createClient()
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError) {
    return redirectWithError(origin, ROUTES.PUBLIC.HOME, ERROR_CODES.AUTH.AUTH_CALLBACK_ERROR)
  }

  const {
    data: { user: authUser },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !authUser?.id) {
    return redirectWithError(origin, ROUTES.PUBLIC.HOME, ERROR_CODES.AUTH.AUTH_CALLBACK_ERROR)
  }

  // 유저 데이터 확인
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  // 신규 유저인 경우
  if (!user) {
    const { error, hasCapacity } = await checkUserCapacity(supabase)

    if (error) {
      return redirectWithError(origin, ROUTES.PUBLIC.HOME, ERROR_CODES.INTERNAL_ERROR)
    }

    // 베타 테스터 모집 종료
    if (!hasCapacity) {
      await supabase.auth.signOut()
      return redirectWithError(
        origin,
        ROUTES.PUBLIC.HOME,
        ERROR_CODES.AUTH.BETA_TESTER_RECRUITMENT_CLOSED
      )
    }
  }

  // 스트라바 연동까지 된 기존 유저 -> 랭킹 페이지로 리다이렉트
  if (user?.strava_connected_at) {
    return NextResponse.redirect(`${origin}${ROUTES.PRIVATE.RANKINGS}`)
  }

  // 스트라바 연동 안된 신규 유저 -> 약관 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}${ROUTES.PUBLIC.TERMS}`)
}
