import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useReportQuery } from '@/hooks/activities/api/useReportQuery'
import { ReportFilter } from '@/lib/types/report'
import { ACTIVITY_COLORS } from '@/lib/constants/report'
import { formatDateForReport } from '@/lib/utils/date'

export default function ReportChartSection({ dateRange, activeCriteria }: ReportFilter) {
  const { data } = useReportQuery(dateRange)

  // chart에는 number type의 데이터가 필요해서 formatActivityValue 함수 미사용
  const chartData = [...data.activities].reverse().map(activity => ({
    date: formatDateForReport(activity.start_date),
    distance: activity.distance || 0,
    elevation: activity.total_elevation_gain || 0,
    speed: activity.average_speed || 0,
    power: activity.average_watts || 0,
  }))

  if (!chartData.length) {
    return <div className="flex h-[174px] items-center justify-center">데이터가 없습니다</div>
  }

  return (
    <div className="h-[174px] w-full p-4 pb-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid
            vertical={true}
            horizontal={false}
            strokeDasharray="5 7"
            className="stroke-brand-disabled"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#414042', fontSize: 13, fontWeight: 400 }}
            interval="preserveStartEnd"
          />
          {activeCriteria.map(type => (
            <YAxis key={`axis-${type}`} yAxisId={type} hide={true} domain={['auto', 'auto']} />
          ))}
          {activeCriteria.map(type => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
              yAxisId={type}
              stroke={ACTIVITY_COLORS[type]}
              strokeWidth={1}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
