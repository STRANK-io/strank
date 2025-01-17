/**
 * 사용자 닉네임의 유효성을 검사하는 함수
 *
 * @description
 * 다음과 같은 유효성 검사를 수행합니다:
 * 1. 닉네임 길이가 2~10자 사이인지 검사
 * 2. 한글(자음/모음 포함) 또는 영문자만 포함되어 있는지 검사
 *
 * @param value - 검사할 닉네임 문자열
 * @returns {boolean} 유효한 닉네임이면 true, 아니면 false를 반환
 */
export const validateNickname = (value: string) => {
  // 길이 검사 (2~10자)
  if (value.length < 2 || value.length > 10) return false

  // 한글(자음/모음 포함) 또는 영문만 허용 (특수문자, 숫자, 공백 제외)
  const onlyKoreanOrEnglish = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]+$/.test(value)

  return onlyKoreanOrEnglish
}
