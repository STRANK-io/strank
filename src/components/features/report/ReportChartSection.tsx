import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useReportQuery } from '@/hooks/activities/api/useReportQuery'
import { ReportFilter } from '@/lib/types/report'
import { ACTIVITY_COLORS } from '@/lib/constants/report'
import { formatDateForReport } from '@/lib/utils/date'

export default function ReportChartSection({ dateRange, activeCriteria }: ReportFilter) {
  const { data } = useReportQuery(dateRange)

  const chartData = [...data.activities].reverse().map(activity => ({
    date: formatDateForReport(activity.date),
    distance: activity.distance / 1000, // km로 변환
    elevation: activity.elevation,
    speed: activity.average_speed,
    power: activity.average_watts,
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
