import { SwitchButton } from '@/components/features/rankings/SwitchButton'
import { RankingFilters } from '@/lib/types/ranking'
import { useRankingFilters } from '@/stores/rankingFilters'

const filterOptions: Record<keyof RankingFilters, { left: string; right: string }> = {
  criteria: { left: '거리 기준', right: '고도 기준' },
  district: { left: '서울시', right: '지역구' },
  period: { left: '지난주', right: '실시간' },
}

export default function FilterSwitch({ type }: { type: keyof RankingFilters }) {
  const { filters, setFilters } = useRankingFilters()

  const isRight = {
    criteria: filters.criteria === 'elevation',
    district: filters.district === 'users',
    period: filters.period === 'now',
  }[type]

  const handleFilterChange = (type: keyof RankingFilters, value: 'left' | 'right') => {
    setFilters(type, value)
  }

  return (
    <div className="flex items-center gap-1 rounded-[40px] bg-[#f9f9f9] p-2">
      <SwitchButton isActive={!isRight} onClick={() => handleFilterChange(type, 'left')}>
        {filterOptions[type].left}
      </SwitchButton>

      <SwitchButton isActive={isRight} onClick={() => handleFilterChange(type, 'right')}>
        {filterOptions[type].right}
      </SwitchButton>
    </div>
  )
}
