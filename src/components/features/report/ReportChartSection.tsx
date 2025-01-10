import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useReportQuery } from '@/hooks/activities/api/useReportQuery'
import { ReportFilter } from '@/lib/types/report'
import { ACTIVITY_COLORS } from '@/lib/constants/report'
import { formatDateForReport } from '@/lib/utils/date'

export default function ReportChartSection({ dateRange, activeCriteria }: ReportFilter) {
  const { data } = useReportQuery(dateRange)

  // 각 값이 숫자여야하므로 formatActivityValue를 사용하지 않음
  const chartData = [...data.activities].reverse().map(activity => ({
    date: formatDateForReport(activity.date),
    distance: activity.distance ? activity.distance / 1000 : 0, // m -> km
    elevation: activity.total_elevation_gain ?? 0,
    speed: activity.average_speed ?? 0,
    power: activity.average_watts ?? 0,
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
          <YAxis axisLine={false} tickLine={false} tick={false} width={0} />
          {activeCriteria.map(type => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
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
