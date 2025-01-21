import PrivatePageHeader from '@/components/common/PrivatePageHeader'
import PrivatePageNav from '@/components/common/PrivatePageNav'
import { UserProvider } from '@/contexts/UserContext'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { createClient } from '@/lib/supabase/server'
import { redirectWithError } from '@/lib/utils/auth'
import { headers } from 'next/headers'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return redirectWithError(origin, ROUTES.PUBLIC.HOME, ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED)
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(
      `
      *,
      strava_user_tokens (
        strava_athlete_id
      )
    `
    )
    .eq('id', user.id)
    .maybeSingle()

  const athleteId = userData?.strava_user_tokens?.strava_athlete_id

  if (userError || !userData || !athleteId) {
    return redirectWithError(origin, ROUTES.PUBLIC.HOME, ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED)
  }

  return (
    <UserProvider userId={userData.id} athleteId={athleteId}>
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto min-h-screen w-full max-w-[450px] bg-[#FFF9FA] pt-11">
          <PrivatePageHeader />
          {children}
          <div className="fixed bottom-3 left-1/2 flex w-full max-w-[450px] -translate-x-1/2 justify-center px-5">
            <PrivatePageNav />
          </div>
        </div>
      </main>
    </UserProvider>
  )
}
