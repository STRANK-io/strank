'use client'

import FilterSwitch from '@/components/features/rankings/FilterSwitch'

export default function RankingsFilter() {
  return (
    <div className="rounded-3xl bg-white p-4" style={{ boxShadow: '0px 8px 16px 0px #00000017' }}>
      <div className="space-y-2">
        <FilterSwitch type="criteria" />
        <FilterSwitch type="district" />
        <FilterSwitch type="period" />
      </div>

      <p className="mt-4 px-2 text-base font-medium leading-[20.8px] text-brand-dark">
        Everyone으로 설정한 데이터만 조회됩니다.
        <br />
        랭킹에 표함되는 기록은 최초 스트라바에
        <br />
        Everyone으로 설정한 기록만 표함됩니다.
      </p>
    </div>
  )
}
