// 거리만 m에서 km 변환을 위해 1000으로 나눔 & 소수점 절사 & 세자리 마다 콤마 추가
export const formatActivityValue = (value: number | null, isDistance = false) => {
  if (!value) return null
  const formattedValue = isDistance ? value / 1000 : value
  return Math.round(formattedValue).toLocaleString('ko-KR')
}
