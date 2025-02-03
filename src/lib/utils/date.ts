import { parseISO, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

/**
 * YYYY.MM.DD 형식의 날짜를 MM.DD 형식으로 변환하는 함수
 *
 * @param date - 변환할 날짜 문자열
 * @returns 변환된 날짜 문자열
 */
export const formatDateForReport = (date: string | null) => {
  if (!date) return '-'

  try {
    const parsedDate = parseISO(date)
    return format(parsedDate, 'MM.dd')
  } catch {
    return '-'
  }
}

/**
 * UTC 시간을 한국 시간으로 변환하는 함수
 *
 * @example
 * const startDateUTC = "2025-01-14 22:34:22";
 * const koreanFormattedDate = convertUTCToKoreanTime(startDateUTC);
 *
 * @param utcDateString - 변환할 UTC 날짜 문자열
 * @returns 한국 시간대로 변환된 날짜 문자열
 */
export function convertUTCToKoreanTime(utcDateString: string) {
  const timeZone = 'Asia/Seoul'
  const parsedDate = parseISO(utcDateString)
  const koreanTime = toZonedTime(parsedDate, timeZone)

  // 한국 시간 형식으로 출력
  return format(koreanTime, 'yyyy-MM-dd HH:mm:ss')
}
