import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { ReactNode } from 'react'

interface SwitchButtonProps {
  isActive: boolean
  onClick: () => void
  children: ReactNode
}

export const SwitchButton = ({ isActive, onClick, children }: SwitchButtonProps) => (
  <Button
    className={cn(
      'flex-1 rounded-full px-6 py-[10px]',
      'text-sm font-normal leading-[18.2px]',
      isActive
        ? 'bg-white text-brand-primary hover:bg-white'
        : 'bg-transparent text-[#C8CBC8] hover:bg-transparent'
    )}
    style={{ boxShadow: isActive ? '0px 2px 8px 0px #3A414F1A' : '' }}
    onClick={onClick}
  >
    {children}
  </Button>
)
