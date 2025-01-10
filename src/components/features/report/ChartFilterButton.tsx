import { Button } from '@/components/ui/button'
import { ACTIVITY_COLORS } from '@/lib/constants/report'
import { ActiveCriteriaType } from '@/lib/types/report'
import { cn } from '@/lib/utils/cn'

interface Props {
  text: string
  onClick: () => void
  ActiveCriteriaType: ActiveCriteriaType
  isActive?: boolean
}

export default function ChartFilterButton({ text, onClick, ActiveCriteriaType, isActive }: Props) {
  const color = isActive ? ACTIVITY_COLORS[ActiveCriteriaType] : '#E0E3E0'

  return (
    <Button
      onClick={onClick}
      variant="outline"
      size="default"
      className={cn(
        'flex h-fit w-fit flex-1 gap-2 rounded-full p-2',
        'text-[13px] font-medium leading-[16.9px] text-brand-dark',
        'hover:bg-white'
      )}
      style={{ borderColor: color }}
    >
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      {text}
    </Button>
  )
}
