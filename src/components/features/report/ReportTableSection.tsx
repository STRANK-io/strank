import ReportTableRow from '@/components/features/report/ReportTableRow'
import { useReportQuery } from '@/hooks/activities/api/useReportQuery'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { ReportFilter } from '@/lib/types/report'
import { formatActivityValue } from '@/lib/utils/activity'
import { formatDateForReport } from '@/lib/utils/date'

const ACTIVITY_TABLE_HEADERS = ['날짜', '거리', '고도', '평균속도', '평균파워']

export default function ReportTableSection({ dateRange }: Pick<ReportFilter, 'dateRange'>) {
  const { data } = useReportQuery(dateRange)

  if (!data.activities.length) {
    return (
      <div className="p-4 pt-0">
        <ReportTableRow texts={ACTIVITY_TABLE_HEADERS} />
        <div className="flex items-center justify-center py-4">데이터가 없습니다</div>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto p-4 pt-0">
      <div className="w-full">
        <ReportTableRow texts={ACTIVITY_TABLE_HEADERS} />
        <div>
          {data.activities.map(activity => (
            <div key={activity.id}>
              <ReportTableRow
                texts={[
                  formatDateForReport(activity.date),
                  `${formatActivityValue(activity.distance, 'distance')} ${ACTIVITY_UNITS.DISTANCE}`,
                  `${formatActivityValue(activity.total_elevation_gain)} ${ACTIVITY_UNITS.ELEVATION}`,
                  `${formatActivityValue(activity.average_speed, 'speed')} ${ACTIVITY_UNITS.SPEED}`,
                  `${formatActivityValue(activity.average_watts)} ${ACTIVITY_UNITS.POWER}`,
                ]}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
