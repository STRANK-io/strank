'use client'

import { ROUTES } from '@/lib/constants/routes'
import { useRouter } from 'next/navigation'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { useEffect } from 'react'

export default function AgreeButton() {
  const router = useRouter()

  const handleClick = () => {
    router.push(ROUTES.PUBLIC.REGISTER_USER_INFO)
  }

  // 컴포넌트가 마운트될 때 다음 페이지를 미리 가져옴
  useEffect(() => {
    router.prefetch(ROUTES.PUBLIC.REGISTER_USER_INFO)
  }, [router])

  return <PrimaryButton text="Agree" onClick={handleClick} />
}
