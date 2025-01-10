// YYYY.MM.DD -> MM.DD 형식으로 변환
export const formatDateForReport = (date: string) => {
  return (
    new Date(date)
      .toLocaleDateString('ko', {
        month: '2-digit',
        day: '2-digit',
      })
      .replace('. ', '.')
      .slice(0, -1) || ''
  )
}
