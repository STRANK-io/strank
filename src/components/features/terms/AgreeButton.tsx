'use client'

import { ROUTES } from '@/lib/constants/routes'
import { useRouter } from 'next/navigation'

export default function AgreeButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(ROUTES.PUBLIC.STRAVA_CONNECT)}
      className="w-full rounded-2xl bg-brand-primary p-4 text-sm font-medium leading-[23px] text-white"
      style={{ boxShadow: '0px 4px 8px 0px #FF6A3952' }}
    >
      Agree
    </button>
  )
}
