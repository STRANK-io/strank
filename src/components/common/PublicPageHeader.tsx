'use client'

import { useRouter } from 'next/navigation'
import BackIcon from './icons/BackIcon'

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
    <div className="relative flex w-full items-center justify-center px-[10px] py-4">
      <button onClick={handleClick} className="absolute left-[10px]">
        <BackIcon className="text-gray-900" />
      </button>
      <h1 className="text-xl font-bold leading-[24px]">{title}</h1>
    </div>
  )
}
