'use client'

import { ROUTES } from '@/lib/constants/routes'
import { cn } from '@/lib/utils/cn'
import { usePathname } from 'next/navigation'

const STEPS = [
  { label: '약관 동의', path: ROUTES.PUBLIC.TERMS },
  { label: '스트라바 연동', path: ROUTES.PUBLIC.STRAVA_CONNECT },
  { label: '기본정보 입력', path: ROUTES.PUBLIC.REGISTER_USER_INFO },
]

export default function StepIndicator() {
  const pathname = usePathname()

  const getCurrentStepIndex = () => {
    return STEPS.findIndex(step => step.path === pathname)
  }

  return (
    <div className="mt-6 flex items-center justify-between gap-[13px] px-5 py-4">
      {STEPS.map((step, index) => {
        const currentIndex = getCurrentStepIndex()
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <div key={step.path} className="flex w-[109px] items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'h-5 w-5 rounded-full border',
                  isCurrent && 'border-brand-primary bg-[#FF6A394D]',
                  isCompleted && 'border-brand-primary bg-brand-primary',
                  !isCompleted && !isCurrent && 'border-[#E0E3E0] bg-[#E0E3E0]'
                )}
              />
              <span className={cn('text-sm font-bold leading-[18px] text-brand-dark')}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
