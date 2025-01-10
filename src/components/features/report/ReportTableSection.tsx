import ReportTableRow from '@/components/features/report/ReportTableRow'
import { useReportQuery } from '@/hooks/activities/api/useReportQuery'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { ReportFilter } from '@/lib/types/report'
import { formatDateForReport } from '@/lib/utils/date'

export default function ReportTableSection({ dateRange }: Pick<ReportFilter, 'dateRange'>) {
  const { data } = useReportQuery(dateRange)

  if (!data.activities.length) {
    return (
      <div className="p-4 pt-0">
        <ReportTableRow texts={['날짜', '거리', '고도', '속도', '파워']} />
        <div className="flex items-center justify-center py-4">데이터가 없습니다</div>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto p-4 pt-0">
      <div className="w-full">
        <ReportTableRow texts={['날짜', '거리', '고도', '속도', '파워']} />
        <div>
          {data.activities.map(activity => (
            <div key={activity.id}>
              <ReportTableRow
                texts={[
                  formatDateForReport(activity.date),
                  `${(activity.distance / 1000).toFixed(1)}${ACTIVITY_UNITS.distance}`,
                  `${activity.elevation}${ACTIVITY_UNITS.elevation}`,
                  `${activity.average_speed.toFixed(1)}${ACTIVITY_UNITS.speed}`,
                  `${activity.average_watts.toFixed(0)}${ACTIVITY_UNITS.power}`,
                ]}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
