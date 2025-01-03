export const validateNickname = (value: string) => {
  // 길이 검사 (2~10자)
  if (value.length < 2 || value.length > 10) return false

  // 한글(자음/모음 포함) 또는 영문만 허용 (특수문자, 숫자, 공백 제외)
  const onlyKoreanOrEnglish = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]+$/.test(value)

  return onlyKoreanOrEnglish
}
