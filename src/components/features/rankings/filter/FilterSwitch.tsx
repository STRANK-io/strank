import { SwitchButton } from '@/components/features/rankings/filter/SwitchButton'
import { RankingFilters } from '@/lib/types/ranking'
import { FILTER_OPTIONS, useRankingFilters } from '@/stores/rankingFilters'
import { useUserContext } from '@/contexts/UserContext'
import { useGetUserInfoQuery } from '@/hooks/user/api/useGetUserInfoQuery'

export default function FilterSwitch({ type }: { type: keyof RankingFilters }) {
  const { filters, setFilters } = useRankingFilters()
  const { userId } = useUserContext()
  const { data: userInfo } = useGetUserInfoQuery(userId)

  const isRight = filters[type] === FILTER_OPTIONS[type].right.value
  
  // 필터 라벨 설정
  let leftLabel = FILTER_OPTIONS[type].left.label
  let rightLabel = FILTER_OPTIONS[type].right.label

  // district 필터인 경우 province와 district 값을 사용
  if (type === 'district') {
    leftLabel = userInfo?.province || '도/시'
    rightLabel = userInfo?.district || '지역구'
  }

  return (
    <div className="flex items-center gap-1 rounded-[40px] bg-[#f9f9f9] p-2">
      <SwitchButton isActive={!isRight} onClick={() => setFilters(type, 'left')}>
        {leftLabel}
      </SwitchButton>

      <SwitchButton isActive={isRight} onClick={() => setFilters(type, 'right')}>
        {rightLabel}
      </SwitchButton>
    </div>
  )
}
