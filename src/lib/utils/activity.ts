/**
 * 소수점 절사 & 세자리 마다 콤마 추가
 *
 * @param value - 처리할 숫자
 * @returns {string} 처리된 숫자 문자열
 */
export const formatActivityValue = (value: number | null): string => {
  if (value === null) return '0'
  return Math.round(value).toLocaleString('ko-KR')
}
