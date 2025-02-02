'use client'

import BackIcon from '@/components/common/icons/BackIcon'
import { useRouter } from 'next/navigation'

interface PublicPageHeaderProps {
  title: string
  href: string
}

export default function PublicPageHeader({ title, href }: PublicPageHeaderProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(href, { scroll: false })
  }

  return (
    <header className="sticky top-0 flex w-full items-center justify-center bg-white px-[10px] py-4">
      <button onClick={handleClick} className="absolute left-[10px]">
        <BackIcon className="text-gray-900" />
      </button>
      <h1 className="text-xl font-bold leading-[24px]">{title}</h1>
    </header>
  )
}
