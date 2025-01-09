import { SwitchButton } from '@/components/features/rankings/SwitchButton'
import { RankingFilters } from '@/lib/types/ranking'
import { useRouter, useSearchParams } from 'next/navigation'

type FilterSwitchOption = {
  left: string
  right: string
}

const filterOptions: Record<keyof RankingFilters, FilterSwitchOption> = {
  criteria: { left: '거리 기준', right: '고도 기준' },
  district: { left: '서울시', right: '지역구' },
  period: { left: '지난주', right: '실시간' },
}

export default function FilterSwitch({ type }: { type: keyof RankingFilters }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCriteria = (searchParams.get('criteria') as RankingFilters['criteria']) || 'distance'
  const currentDistrict = (searchParams.get('district') as RankingFilters['district']) || 'all'
  const currentPeriod = (searchParams.get('period') as RankingFilters['period']) || 'lastweek'

  const handleFilterChange = (type: keyof RankingFilters, value: 'left' | 'right') => {
    const params = new URLSearchParams(searchParams.toString())

    const newValue = {
      criteria: value === 'left' ? 'distance' : 'elevation',
      district: value === 'left' ? 'all' : 'users',
      period: value === 'left' ? 'lastweek' : 'now',
    }[type]

    const currentValue = params.get(type)
    if (currentValue === newValue) return

    params.set(type, newValue)
    router.push(`?${params.toString()}`)
  }

  const isRight = {
    criteria: currentCriteria === 'elevation',
    district: currentDistrict === 'users',
    period: currentPeriod === 'now',
  }[type]

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
