'use client'

import { Suspense, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import ReportFilterSection from '@/components/features/report/ReportFilterSection'
import ReportChartSection from '@/components/features/report/ReportChartSection'
import ReportTableSection from '@/components/features/report/ReportTableSection'
import { ReportFilter } from '@/lib/types/report'

export default function ReportPage() {
  const [filter, setFilter] = useState<ReportFilter>({
    dateRange: '3months',
    activeCriteria: ['distance', 'elevation', 'speed', 'power'],
  })

  return (
    <div className="mt-[39px] px-5 pb-[150px]">
      <section className="mb-6">
        <ReportFilterSection filter={filter} onFilterChange={setFilter} />
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-white">
        <Suspense
          fallback={
            <div className="p-4 pb-0">
              <Skeleton className="h-[174px] w-full rounded-3xl" />
            </div>
          }
        >
          <ReportChartSection dateRange={filter.dateRange} activeCriteria={filter.activeCriteria} />
        </Suspense>

        <Suspense
          fallback={
            <div className="p-4 pt-0">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="mb-1 h-[25px] rounded-full" />
              ))}
            </div>
          }
        >
          <ReportTableSection dateRange={filter.dateRange} />
        </Suspense>
      </section>
    </div>
  )
}
