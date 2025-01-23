'use client'
import RankingIcon from '@/components/common/icons/RankingIcon'
import ReportIcon from '@/components/common/icons/ReportIcon'
import TimelineIcon from '@/components/common/icons/TimelineIcon'
import UserIcon from '@/components/common/icons/UserIcon'
import { ROUTES } from '@/lib/constants/routes'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    path: ROUTES.PRIVATE.RANKINGS,
    icon: RankingIcon,
    label: '랭킹',
  },
  {
    path: ROUTES.PRIVATE.REPORT,
    icon: ReportIcon,
    label: '리포트',
  },
  {
    path: ROUTES.PRIVATE.TIMELINE,
    icon: TimelineIcon,
    label: '타임라인',
  },
  {
    path: ROUTES.PRIVATE.MYPAGE,
    icon: UserIcon,
    label: '마이페이지',
  },
]

export default function PrivatePageNav() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'flex w-full items-center justify-between rounded-[32px] p-4 pb-6',
        'bg-white shadow-[0px_8px_16px_0px_#00000017]'
      )}
    >
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const isActive = pathname === path
        return (
          <Link
            href={path}
            key={path}
            className={cn('flex flex-col items-center gap-2', isActive && 'pointer-events-none')}
          >
            <div className="flex h-12 w-12 items-center justify-center">
              <Icon className={isActive ? 'fill-brand-primary' : 'fill-brand-dark'} />
            </div>
            <span
              className={cn(
                'text-sm font-medium leading-[16.71px]',
                isActive ? 'text-brand-primary' : 'text-brand-dark'
              )}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
