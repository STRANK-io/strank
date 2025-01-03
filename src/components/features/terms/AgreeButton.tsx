'use client'

import { ROUTES } from '@/lib/constants/routes'
import { useRouter } from 'next/navigation'
import { PrimaryButton } from '@/components/common/PrimaryButton'

export default function AgreeButton() {
  const router = useRouter()

  const handleClick = () => {
    router.push(ROUTES.PUBLIC.STRAVA_CONNECT)
  }

  return <PrimaryButton text="Agree" onClick={handleClick} />
}
