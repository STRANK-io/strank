import OutlineButton from '@/components/common/OutlineButton'
import ChartFilterButton from '@/components/features/report/ChartFilterButton'
import { ReportFilter, ActiveCriteriaType, DateRange } from '@/lib/types/report'

interface Props {
  filter: ReportFilter
  onFilterChange: (filter: ReportFilter) => void
}

const DATE_RANGE_OPTIONS: { value: DateRange; text: string }[] = [
  { value: '3months', text: '최근 3개월' },
  { value: '1month', text: '최근 한달' },
  { value: '1week', text: '최근 일주일' },
]

const ACTIVITY_OPTIONS: { value: ActiveCriteriaType; text: string }[] = [
  { value: 'distance', text: '거리' },
  { value: 'elevation', text: '고도' },
  { value: 'speed', text: '평균속도' },
  { value: 'power', text: '평균파워' },
]

export default function ReportFilterSection({ filter, onFilterChange }: Props) {
  const handleDateRangeChange = (dateRange: ReportFilter['dateRange']) => {
    onFilterChange({ ...filter, dateRange })
  }

  const handleActivityTypeToggle = (type: ActiveCriteriaType) => {
    const newActiveTypes = filter.activeCriteria.includes(type)
      ? filter.activeCriteria.filter(t => t !== type)
      : [...filter.activeCriteria, type]

    onFilterChange({
      ...filter,
      activeCriteria: newActiveTypes.length > 0 ? newActiveTypes : [type], // 최소 하나는 선택되어야 함
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        {DATE_RANGE_OPTIONS.map(({ value, text }) => (
          <OutlineButton
            key={`${value}-${text}`}
            text={text}
            onClick={() => handleDateRangeChange(value)}
            isActive={filter.dateRange === value}
            className="px-0"
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {ACTIVITY_OPTIONS.map(({ value, text }) => (
          <ChartFilterButton
            key={`${value}-${text}`}
            text={text}
            onClick={() => handleActivityTypeToggle(value)}
            ActiveCriteriaType={value}
            isActive={filter.activeCriteria.includes(value)}
          />
        ))}
      </div>
    </div>
  )
}
