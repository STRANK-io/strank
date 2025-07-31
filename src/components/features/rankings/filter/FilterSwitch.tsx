import { SwitchButton } from '@/components/features/rankings/filter/SwitchButton'
import { RankingFilters } from '@/lib/types/ranking'
import { FILTER_OPTIONS, useRankingFilters } from '@/stores/rankingFilters'
import { useUserContext } from '@/contexts/UserContext'
import { useGetUserInfoQuery } from '@/hooks/user/api/useGetUserInfoQuery'

export default function FilterSwitch({ type }: { type: keyof RankingFilters }) {
  const { filters, setFilters, set } = useRankingFilters()
  const { userId } = useUserContext()
  const { data: userInfo } = useGetUserInfoQuery(userId)

  // 필터 라벨 설정
  let leftLabel = FILTER_OPTIONS[type].left.label
  let rightLabel = FILTER_OPTIONS[type].right.label

  // district 필터인 경우 province와 district 값을 사용
  if (type === 'district') {
    leftLabel = userInfo?.province || '도/시'
    rightLabel = userInfo?.district || '지역구'
  }

  // 모든 필터에 대해 setFilters 사용
  const handleClick = (position: 'left' | 'right') => {
    console.log('Filter click:', {
      type,
      position,
      value: FILTER_OPTIONS[type][position].value,
      userInfo,
    });
    setFilters(type, position)
  }

  const isRight = filters[type] === 'users' // district 필터의 경우 users일 때만 오른쪽 활성화

  return (
    <div className="flex items-center gap-1 rounded-[40px] bg-[#f9f9f9] p-2">
      <SwitchButton isActive={!isRight} onClick={() => handleClick('left')}>
        {leftLabel}
      </SwitchButton>

      <SwitchButton isActive={isRight} onClick={() => handleClick('right')}>
        {rightLabel}
      </SwitchButton>
    </div>
  )
}
