import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { ButtonHTMLAttributes } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  disabled?: boolean
}

export function PrimaryButton({ text, disabled = false, onClick, ...props }: PrimaryButtonProps) {
  return (
    <Button
      className={cn(
        'h-[65px] w-full rounded-2xl bg-brand-primary opacity-100  hover:bg-brand-primary ',
        'text-lg font-medium leading-[23.4px]',
        'disabled:bg-brand-disabled disabled:text-white disabled:opacity-100'
      )}
      onClick={onClick}
      disabled={disabled}
      style={{ boxShadow: disabled ? '' : '0px 4px 8px 0px #FF6A3952' }}
      {...props}
    >
      {text}
    </Button>
  )
}
