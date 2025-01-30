'use client'

import FilterSwitch from '@/components/features/rankings/filter/FilterSwitch'

export default function RankingsFilter() {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-[0px_8px_16px_0px_#00000017]">
      <div className="space-y-2">
        <FilterSwitch type="criteria" />
        <FilterSwitch type="district" />
        <FilterSwitch type="period" />
      </div>

      <p className="mt-4 break-keep px-2 text-xs font-medium text-brand-dark">
        Everyone으로 설정한 액티비티만 랭킹에 포함됩니다.
        <br />
        공개 설정을 변경한 경우, “마이페이지”의 “액티비티 최신화”를 통해 데이터를 최신화해주세요.
      </p>
    </div>
  )
}
