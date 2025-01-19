/**
 * 소수점 절사 & 세자리 마다 콤마 추가
 *
 * @param value - 처리할 숫자
 * @param type - ('distance' | 'speed' | 'default') 단위 변환을 해야하는 경우 사용
 * @returns {string} 처리된 숫자 문자열
 */
export const formatActivityValue = (
  value: number | null,
  type?: 'distance' | 'speed' | 'default'
): string => {
  if (value === null) return '0'

  let convertedValue = value

  // 거리(m)를 km로 변환
  if (type === 'distance') {
    convertedValue = value / 1000
  }
  // 속도(m/s)를 km/h로 변환
  else if (type === 'speed') {
    convertedValue = (value * 3600) / 1000
  }

  // 소수점 절사 (Math.floor 사용)
  const truncatedValue = Math.floor(convertedValue)

  return truncatedValue.toLocaleString('ko-KR')
}
