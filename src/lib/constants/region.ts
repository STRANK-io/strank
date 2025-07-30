export const PROVINCES = [
  '서울시',
  '부산시',
  '대구시',
  '인천시',
  '광주시',
  '대전시',
  '울산시',
  '세종시',
  '경기도',
  '강원도',
  '충청북도',
  '충청남도',
  '전라북도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주도',
] as const

export const DISTRICTS = [
  '강남구',
  '강동구',
  '강북구',
  '강서구',
  '관악구',
  '광진구',
  '구로구',
  '금천구',
  '노원구',
  '도봉구',
  '동대문구',
  '동작구',
  '마포구',
  '서대문구',
  '서초구',
  '성동구',
  '성북구',
  '송파구',
  '양천구',
  '영등포구',
  '용산구',
  '은평구',
  '종로구',
  '중구',
  '중랑구',
] as const

export type Province = (typeof PROVINCES)[number]
export type District = (typeof DISTRICTS)[number]

export interface RegionValue {
  province: Province
  district: District
}
