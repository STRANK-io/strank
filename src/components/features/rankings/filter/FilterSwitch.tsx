import { SwitchButton } from '@/components/features/rankings/filter/SwitchButton'
import { RankingFilters } from '@/lib/types/ranking'
import { FILTER_OPTIONS, useRankingFilters } from '@/stores/rankingFilters'

export default function FilterSwitch({ type }: { type: keyof RankingFilters }) {
  const { filters, setFilters } = useRankingFilters()

  const isRight = filters[type] === FILTER_OPTIONS[type].right.value

  return (
    <div className="flex items-center gap-1 rounded-[40px] bg-[#f9f9f9] p-2">
      <SwitchButton isActive={!isRight} onClick={() => setFilters(type, 'left')}>
        {FILTER_OPTIONS[type].left.label}
      </SwitchButton>

      <SwitchButton isActive={isRight} onClick={() => setFilters(type, 'right')}>
        {FILTER_OPTIONS[type].right.label}
      </SwitchButton>
    </div>
  )
}
