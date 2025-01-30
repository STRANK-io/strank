import CompatibleWithStravaImage from '@/components/common/CompatibleWithStravaImage'
import PrivatePageHeader from '@/components/common/PrivatePageHeader'
import PrivatePageNav from '@/components/common/PrivatePageNav'
import { UserProvider } from '@/contexts/UserContext'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { redirectWithError } from '@/lib/utils/auth'
import { headers } from 'next/headers'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const userId = headersList.get('x-user-id')

  if (!userId) {
    return redirectWithError(
      process.env.NEXT_PUBLIC_APP_URL || 'https://strank.io',
      ROUTES.PUBLIC.HOME,
      ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED
    )
  }

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[450px] bg-[#FFF9FA] pt-11">
        <UserProvider userId={userId}>
          <PrivatePageHeader />

          {children}

          <div className="flex h-full w-full items-center justify-center pb-24">
            <CompatibleWithStravaImage />
          </div>

          <div className="fixed bottom-0 left-1/2 flex w-full max-w-[450px] -translate-x-1/2 justify-center">
            <PrivatePageNav />
          </div>
        </UserProvider>
      </div>
    </main>
  )
}
