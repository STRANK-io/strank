import PrivatePageHeader from '@/components/common/PrivatePageHeader'
import PrivatePageNav from '@/components/common/PrivatePageNav'
import { UserProvider } from '@/contexts/UserContext'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { createClient } from '@/lib/supabase/server'
import { redirectWithError } from '@/lib/utils/auth'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirectWithError(
      process.env.NEXT_PUBLIC_APP_URL || 'https://strank.io',
      ROUTES.PUBLIC.HOME,
      ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED
    )
  }

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[450px] bg-[#FFF9FA] pt-11">
        <UserProvider userId={user.id}>
          <PrivatePageHeader />
          {children}
          <div className="fixed bottom-0 left-1/2 flex w-full max-w-[450px] -translate-x-1/2 justify-center">
            <PrivatePageNav />
          </div>
        </UserProvider>
      </div>
    </main>
  )
}
