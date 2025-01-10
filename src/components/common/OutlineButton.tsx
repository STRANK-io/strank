import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface OutlineButtonProps {
  text: string
  onClick: () => void
  isActive?: boolean
  className?: string
}

export default function OutlineButton({
  text,
  onClick,
  isActive = true,
  className,
}: OutlineButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      size={'default'}
      className={cn(
        'h-fit flex-1 py-[16.5px]',
        'text-base font-medium leading-[20.8px] text-brand-primary hover:text-brand-primary',
        'bg-white  hover:bg-white ',
        'rounded-xl border-[0.75px] border-brand-primary',
        'shadow-[0px_3px_6px_0px_#FF6A3952]',
        !isActive && 'border-[#b1b1b1] text-brand-dark shadow-none',
        className
      )}
    >
      {text}
    </Button>
  )
}
