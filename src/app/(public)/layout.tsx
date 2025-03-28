'use client'

import PublicPageHeader from '@/components/common/PublicPageHeader'
import { ROUTES } from '@/lib/constants/routes'
import { usePathname } from 'next/navigation'

const HAS_TO_SHOW_HEADER_PATHS = [
  {
    path: ROUTES.PUBLIC.TERMS,
    prevPath: ROUTES.PUBLIC.HOME,
    label: '약관 동의',
  },
  {
    path: ROUTES.PUBLIC.REGISTER_USER_INFO,
    prevPath: ROUTES.PUBLIC.TERMS,
    label: '기본정보 입력',
  },
  {
    path: ROUTES.PUBLIC.STRAVA_CONNECT,
    prevPath: ROUTES.PUBLIC.REGISTER_USER_INFO,
    label: '스트라바 연동',
  },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentItem = HAS_TO_SHOW_HEADER_PATHS.find(item => item.path === pathname)

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[450px] bg-white pt-11">
        {currentItem && <PublicPageHeader title={currentItem.label} href={currentItem.prevPath} />}
        {children}
      </div>
    </main>
  )
}
