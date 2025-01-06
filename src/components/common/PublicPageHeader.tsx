'use client'

import { useRouter, usePathname } from 'next/navigation'
import BackIcon from './icons/BackIcon'
import { ROUTES } from '@/lib/constants/routes'

interface PublicPageHeaderProps {
  title: string
  href: string
}

export default function PublicPageHeader({ title, href }: PublicPageHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleClick = () => {
    router.push(href, { scroll: false })
  }

  return (
    <header className="relative flex w-full items-center justify-center px-[10px] py-4">
      {pathname !== ROUTES.PUBLIC.HOME && (
        <button onClick={handleClick} className="absolute left-[10px]">
          <BackIcon className="text-gray-900" />
        </button>
      )}
      <h1 className="text-xl font-bold leading-[24px]">{title}</h1>
    </header>
  )
}
