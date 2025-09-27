// =========================================
// 설정
// =========================================
const USE_ABSOLUTE_ZONES = true   // 파워존 기준: 절대 존(true) / FTP 비율(false)
const ZONE_METHOD = 'count'       // 존 비율 산출 방식: 'count' / 'time'
const SMOOTH_POWER = false        // 파워 스무딩 적용 여부
const FTP_RESET = 130             // FTP 기준치 (USE_ABSOLUTE_ZONES=false일 때 사용)

interface StreamData {
  time?: number[]
  distance?: number[]
  altitude?: number[]
  velocity_smooth?: number[]
  watts?: number[]
  heartrate?: number[]
  cadence?: number[]
  moving?: (number | boolean)[]
}

interface RiderStyle {
  icon: string
  name: string
  desc: string
}

interface AnalysisResult {
  총거리: number
  총고도: number
  평균속도: number
  최고속도: number
  평균파워: number
  최대파워: number
  최고심박수: number
  평균케이던스: number
  powerZoneRatios: Record<string, number>
  hrZoneRatios: Record<string, number>
  peakPowers: Record<string, number | null>
  hrZoneAverages: Record<string, number | null>
  ftp20: number | null
  ftp60: number | null
  riderStyle: RiderStyle
  courseName?: string | null   // ?? 코스명 필드 추가
}

// =========================================
// 존 정의
// =========================================
const POWER_ZONES = {
  Z1: [0, 110],
  Z2: [111, 191],
  Z3: [192, 209],
  Z4: [210, 220],
  Z5: [221, 244],
  Z6: [245, 660],
  Z7: [661, 2500],
}

const POWER_ZONES_FTP = {
  Z1: [0, Math.round(FTP_RESET * 0.55)],
  Z2: [Math.round(FTP_RESET * 0.56), Math.round(FTP_RESET * 0.75)],
  Z3: [Math.round(FTP_RESET * 0.76), Math.round(FTP_RESET * 0.90)],
  Z4: [Math.round(FTP_RESET * 0.91), Math.round(FTP_RESET * 1.05)],
  Z5: [Math.round(FTP_RESET * 1.06), Math.round(FTP_RESET * 1.20)],
  Z6: [Math.round(FTP_RESET * 1.21), Math.round(FTP_RESET * 1.50)],
  Z7: [Math.round(FTP_RESET * 1.51), 2500],
}

const HR_ZONES = {
  Z1: [0, 114],
  Z2: [115, 133],
  Z3: [134, 152],
  Z4: [153, 171],
  Z5: [172, 225],
}

// =========================================
// 코스명 유틸 함수
// =========================================
async function reverseGeocode(point: { lat: number; lon: number }): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${point.lat}&lon=${point.lon}&format=json&zoom=14&addressdetails=1&extratags=1`
  const res = await fetch(url, {
    headers: { "User-Agent": "STRANK/1.0 (support@strank.io)" },
  })
  const data = await res.json()

  // 랜드마크/지형지물 후보
  const feature =
    data.name ||
    data.extratags?.peak ||       // 산/봉우리
    data.extratags?.river ||      // 강
    data.extratags?.water ||      // 호수/저수지
    data.extratags?.park ||       // 공원
    data.extratags?.bridge ||     // 다리
    data.extratags?.cycleway      // 자전거도로

  // 행정구역 (소단위 → 대단위)
  const admin =
    data.address?.neighbourhood ||
    data.address?.suburb ||
    data.address?.city_district ||
    data.address?.borough ||
    data.address?.town ||
    data.address?.village ||
    data.address?.county ||
    data.address?.state_district ||
    data.address?.city ||
    data.address?.state ||
    null

  // 최종 결과 조합 (중복 방지 포함)
  if (feature && admin) {
    if (feature === admin) return feature   // 중복이면 한 번만
    return `${feature}(${admin})`
  }
  if (feature) return feature
  if (admin) return admin
  return "알 수 없음"
}

function getSegmentCount(distanceKm: number): number {
 if (distanceKm <= 5) return 2
 if (distanceKm <= 30) return 4
 if (distanceKm <= 80) return 5
 return 6
}

function splitCourseByIndex(latlngs: { lat: number; lon: number }[], segmentCount = 6) {
  if (latlngs.length <= segmentCount) return latlngs
  const step = Math.floor(latlngs.length / (segmentCount - 1))
  return Array.from({ length: segmentCount }, (_, i) =>
    latlngs[Math.min(i * step, latlngs.length - 1)]
  )
}
export async function generateCourseName(
  latlngs: { lat: number; lon: number }[],
  distanceKm: number
): Promise<string> {
  const segmentCount = getSegmentCount(distanceKm)   // ✅ 거리 기반 분할 개수 결정
  const keyPoints = splitCourseByIndex(latlngs, segmentCount)
  const names = await Promise.all(keyPoints.map(reverseGeocode))

  // ✅ 연속된 중복만 제거 (왕복 루트 보존)
  const cleaned: string[] = []
  for (const n of names) {
    if (!n) continue
    if (cleaned.length === 0 || cleaned[cleaned.length - 1] !== n) {
      cleaned.push(n)
    }
  }

  return cleaned.join(" → ")
}
// =========================================
// 유틸 함수
// =========================================
function computeAvgPowerMovingIncludingZeros(
  watts: number[],
  moving?: (number | boolean)[],
  velocity?: number[]
): number {
  if (!watts || watts.length === 0) return 0
  const N = watts.length

  let movingMask: boolean[]
  if (moving && moving.length === N) {
    movingMask = moving.map(v => Boolean(v))
  } else if (velocity && velocity.length === N) {
    movingMask = velocity.map(v => (v || 0) > 0.5)
  } else {
    movingMask = Array(N).fill(true)
  }

  let sum = 0
  let cnt = 0
  for (let i = 0; i < N; i++) {
    if (movingMask[i]) {
      const w = typeof watts[i] === 'number' && isFinite(watts[i]) ? watts[i] : 0
      sum += w
      cnt++
    }
  }
  return cnt > 0 ? Math.round(sum / cnt) : 0
}

function computeFtpFromPower(
  watts: number[],
  dt: number[],
  totalTime: number,
  windowSec = 1200,
  factor = 0.95
): number | null {
  if (watts.length === 0) return null
  if (totalTime < windowSec) return null

  const arrDt = dt
  const medianDt = arrDt.slice().sort((a, b) => a - b)[Math.floor(arrDt.length / 2)]
  const n = Math.max(1, Math.min(Math.round(windowSec / medianDt), watts.length))
  if (n <= 1 || n > watts.length) return null

  let maxAvg = 0
  for (let i = 0; i <= watts.length - n; i++) {
    const window = watts.slice(i, i + n)
    const avg = window.reduce((sum, w) => sum + (w || 0), 0) / n
    if (avg > maxAvg) maxAvg = avg
  }
  return Math.round(maxAvg * factor * 10) / 10
}

/**
 * 파워 데이터가 없을 때 GPS/고도/속도로 추정 FTP
 */
function estimateFtpWithoutPower(
  distanceM: number[],
  altitudeM: number[],
  dt: number[],
  velocitySmooth: number[] | undefined,
  totalTime: number,
  estimatePowerFunc: (dist: number[], alt: number[], dt: number[], vel?: number[]) => number[]
): { ftp20: number | null; ftp60: number | null } {
  const wattsEst = estimatePowerFunc(distanceM, altitudeM, dt, velocitySmooth)
  const wattsSmooth = rollingMean(wattsEst, 15, true, 1)
  
  const ftp20 = computeFtpFromPower(wattsSmooth, dt, totalTime, 20 * 60, 0.95)
  const ftp60 = computeFtpFromPower(wattsSmooth, dt, totalTime, 60 * 60, 1.0)
  
  return { ftp20, ftp60 }
}

/**
 * 이동평균 계산 함수
 */
function rollingMean(data: number[], window: number, center = true, minPeriods = 1): number[] {
  const result: number[] = []
  const halfWindow = Math.floor(window / 2)

  for (let i = 0; i < data.length; i++) {
    let start: number, end: number
    if (center) {
      start = Math.max(0, i - halfWindow)
      end = Math.min(data.length, i + halfWindow + 1)
    } else {
      start = Math.max(0, i - window + 1)
      end = i + 1
    }
    const windowData = data.slice(start, end).filter(d => d != null && !isNaN(d))
    if (windowData.length >= minPeriods) {
      const sum = windowData.reduce((s, d) => s + d, 0)
      result.push(sum / windowData.length)
    } else {
      result.push(data[i] || 0)
    }
  }
  return result
}


/**
 * 중앙값 필터 함수
 */
function medianFilter(data: number[], kernelSize: number): number[] {
  const result: number[] = []
  const halfKernel = Math.floor(kernelSize / 2)
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfKernel)
    const end = Math.min(data.length, i + halfKernel + 1)
    const window = data.slice(start, end).filter(d => d != null && !isNaN(d))
    
    if (window.length > 0) {
      window.sort((a, b) => a - b)
      const mid = Math.floor(window.length / 2)
      result.push(window.length % 2 === 0 
        ? (window[mid - 1] + window[mid]) / 2 
        : window[mid])
    } else {
      result.push(data[i] || 0)
    }
  }
  
  return result
}

/**
 * 파워 추정 함수
 */
function estimatePower(
  distanceM: number[],
  altitudeM: number[],
  dt: number[],
  velocitySmooth?: number[],
  mass = 75,
  cda = 0.3,
  cr = 0.004,
  rho = 1.226,
  g = 9.81
): number[] {
  const distSmooth = rollingMean(distanceM, 5, true, 1)
  const dDist: number[] = []
  for (let i = 0; i < distSmooth.length; i++) {
    dDist.push(i === 0 ? 0 : distSmooth[i] - distSmooth[i - 1])
  }
  const speedFromDist = dDist.map((dd, i) => dd / (dt[i] || 1))

  // 속도 (m/s), 이상치 제거 (0 ~ 15m/s)
  let speed: number[] = []
  if (velocitySmooth && velocitySmooth.some(v => v > 0)) {
    speed = velocitySmooth.map((vs, i) => {
      const sdVal = speedFromDist[i] || 0
      const s = (vs || 0 + sdVal) / 2
      return Math.min(Math.max(s, 0), 15)
    })
  } else {
    speed = speedFromDist.map(s => Math.min(Math.max(s, 0), 15))
  }

  // 고도 스무딩
  const altSmooth = rollingMean(altitudeM, 8, true, 1)
  const dAlt: number[] = []
  for (let i = 0; i < altSmooth.length; i++) {
    const diff = i === 0 ? 0 : altSmooth[i] - altSmooth[i - 1]
    dAlt.push(Math.abs(diff) > 1.0 ? 0 : diff)
  }

  // 파워 계산
  const power: number[] = []
  for (let i = 0; i < speed.length; i++) {
    const s = speed[i]
    const deltaTime = dt[i] || 1
    const gradPower = mass * g * dAlt[i] / deltaTime
    const rollPower = mass * g * cr * s
    const aeroPower = 0.5 * rho * cda * Math.pow(s, 3)

    let totalPower = gradPower + rollPower + aeroPower
    totalPower = Math.max(0, Math.min(1500, totalPower)) // 상한 제한
    power.push(totalPower)
  }

  return rollingMean(power, 5, true, 1) // 최종 반환
}

/**
 * 심박수 추정 함수 (Python 스크립트와 동일 - GPS/고도 기반)
 */
function estimateHrFromGpsAlt(
  distanceM: number[],
  altitudeM: number[],
  dt: number[],
  hrMax = 190,
  hrRest = 60
): number[] {
  // 거리 스무딩 (5점 이동평균)
  const distSmooth = rollingMean(distanceM, 5, true, 1)
  const dDist: number[] = []
  for (let i = 0; i < distSmooth.length; i++) {
    if (i === 0) {
      dDist.push(0)
    } else {
      dDist.push(distSmooth[i] - distSmooth[i - 1])
    }
  }
  
  const speed = dDist.map((dd, i) => dd / (dt[i] || 1))
  
  // 고도 스무딩 (8점 이동평균)
  const altSmooth = rollingMean(altitudeM, 8, true, 1)
  const dAlt: number[] = []
  for (let i = 0; i < altSmooth.length; i++) {
    if (i === 0) {
      dAlt.push(0)
    } else {
      const diff = altSmooth[i] - altSmooth[i - 1]
      dAlt.push(Math.abs(diff) > 0.3 ? diff : 0)
    }
  }
  
  // 그래디언트 계산
  const gradient = dDist.map((dd, i) => {
    const ddVal = dd || 0
    const dAltVal = dAlt[i] || 0
    return Math.max(-0.15, Math.min(0.15, dAltVal / (ddVal + 1e-6)))
  })
  
  // 노력 지수 계산
  const speedNorm = speed.map(s => s / 12.0)
  const effortIndex = speedNorm.map((sn, i) => sn + (gradient[i] * 5.0))
  const intensity = effortIndex.map(ei => Math.max(0, Math.min(1.2, ei)))
  
  // 심박수 계산
  const hr = intensity.map(int => hrRest + int * (hrMax - hrRest))
  
  // 스무딩 (10점 이동평균)
  const hrSmooth = rollingMean(hr, 10, true, 1)
  
  return hrSmooth.map(h => Math.round(h))
}

/**
 * 케이던스 추정 함수 (Python 스크립트와 동일 - 특성 기반)
 */
function estimateCadenceFromFeatures(
  speedMps: number[],
  altitudeM: number[],
  distanceM: number[],
  baseRpm = 60,
  alpha = 2.0,
  beta = -150.0,
  gamma = -0.0001
): number[] {
  const s = speedMps.map(sp => sp || 0)
  
  // 거리 차이 계산
  const dDist: number[] = []
  for (let i = 0; i < distanceM.length; i++) {
    if (i === 0) {
      dDist.push(1)
    } else {
      dDist.push((distanceM[i] || 0) - (distanceM[i - 1] || 0))
    }
  }
  
  // 고도 차이 계산
  const dAlt: number[] = []
  for (let i = 0; i < altitudeM.length; i++) {
    if (i === 0) {
      dAlt.push(0)
    } else {
      dAlt.push((altitudeM[i] || 0) - (altitudeM[i - 1] || 0))
    }
  }
  
  // 그래디언트 계산
  const gradient = dDist.map((dd, i) => {
    const ddVal = dd || 1
    const dAltVal = dAlt[i] || 0
    return Math.max(-0.15, Math.min(0.15, dAltVal / (ddVal + 1e-6)))
  })
  
  // 케이던스 계산
  const cadence = s.map((speed, i) => {
    const speedKmh = speed * 3.6
    const dist = distanceM[i] || 0
    const grad = gradient[i] || 0
    
    const cad = baseRpm + alpha * (speedKmh / 20) + beta * grad + gamma * dist
    return Math.max(30, Math.min(110, Math.round(cad)))
  })
  
  return cadence
}

/**
 * 총 거리 계산 (km)
 */
function computeTotalDistanceKm(distanceM: number[]): number {
  if (distanceM.length < 2) return 0
  const validDistances = distanceM.filter(d => d != null)
  if (validDistances.length < 2) return 0
  return Math.round((validDistances[validDistances.length - 1] - validDistances[0]) / 1000)
}

/**
 * 총 고도 상승 계산 (m)
 */
function computeTotalElevationGain(altitudeM: number[]): number {
  if (altitudeM.length < 2) return 0
  
  // 이동평균으로 노이즈 제거
  const smoothed = []
  for (let i = 0; i < altitudeM.length; i++) {
    const start = Math.max(0, i - 4)
    const end = Math.min(altitudeM.length, i + 4)
    const window = altitudeM.slice(start, end).filter(a => a != null)
    smoothed.push(window.reduce((sum, a) => sum + a, 0) / window.length)
  }
  
  let totalGain = 0
  for (let i = 1; i < smoothed.length; i++) {
    const diff = smoothed[i] - smoothed[i - 1]
    if (diff >= 0.12) { // 0.12m 이상 상승만 카운트
      totalGain += diff
    }
  }
  
  return Math.round(totalGain)
}

/**
 * 속도 통계 계산
 */
function computeSpeedStats(speedMps: number[]): { avg: number; max: number } {
  const validSpeeds = speedMps.filter(s => s != null && s > 0).map(s => s * 3.6) // km/h 변환
  if (validSpeeds.length === 0) return { avg: 0, max: 0 }
  
  const avg = validSpeeds.reduce((sum, s) => sum + s, 0) / validSpeeds.length
  const max = Math.max(...validSpeeds)
  
  return { avg: Math.round(avg), max: Math.round(max) }
}

/**
 * 파워 통계 계산
 */
function computePowerStats(watts: number[]): { avg: number; max: number } {
  const validWatts = watts.filter(w => w != null && w > 0)
  if (validWatts.length === 0) return { avg: 0, max: 0 }
  
  const avg = validWatts.reduce((sum, w) => sum + w, 0) / validWatts.length
  const max = Math.max(...validWatts)
  
  return { avg: Math.round(avg), max: Math.round(max) }
}

/**
 * 최고 심박수 계산
 */
function computeHrMax(hr: number[]): number {
  const validHr = hr.filter(h => h != null && h > 0)
  return validHr.length > 0 ? Math.round(Math.max(...validHr)) : 0
}

/**
 * 평균 케이던스 계산
 */
function computeCadenceAvg(cadence: number[]): number {
  const validCadence = cadence.filter(c => c != null && c > 0)
  if (validCadence.length === 0) return 0
  
  const avg = validCadence.reduce((sum, c) => sum + c, 0) / validCadence.length
  return Math.round(avg)
}

/**
 * 존별 라벨링
 */
function labelByZone(value: number | null, zones: Record<string, number[]>): string | null {
  if (value == null) return null
  
  for (const [zone, [low, high]] of Object.entries(zones)) {
    if (low <= value && value <= high) {
      return zone
    }
  }
  return null
}

/**
 * 시간 기반 존 비율 계산
 */
function timeBasedZoneRatios(
  values: number[],
  dt: number[],
  zones: Record<string, number[]>,
  treatZeroAsNan = false
): Record<string, number> {
  const ratios: Record<string, number> = {}
  
  // 존별 시간 합계 계산
  const zoneTimes: Record<string, number> = {}
  let totalTime = 0
  
  for (const zone of Object.keys(zones)) {
    zoneTimes[zone] = 0
    ratios[zone] = 0
  }
  
  for (let i = 0; i < values.length; i++) {
    let value = values[i]
    if (treatZeroAsNan && value === 0) value = null as any
    
    const zone = labelByZone(value, zones)
    if (zone) {
      zoneTimes[zone] += dt[i] || 0
      totalTime += dt[i] || 0
    }
  }
  
  // 비율 계산
  if (totalTime > 0) {
    for (const [zone, time] of Object.entries(zoneTimes)) {
      ratios[zone] = Math.round((time / totalTime) * 100)
    }
  }
  
  // 드리프트 보정 (합이 100%가 되도록)
  const drift = 100 - Object.values(ratios).reduce((sum, r) => sum + r, 0)
  const lastZone = Object.keys(ratios)[Object.keys(ratios).length - 1]
  ratios[lastZone] = Math.max(0, ratios[lastZone] + drift)
  
  return ratios
}

/**
 * 카운트 기반 존 비율 계산
 */
function countBasedZoneRatios(
  values: number[],
  zones: Record<string, number[]>,
  treatZeroAsNan = false
): Record<string, number> {
  const ratios: Record<string, number> = {}
  
  // 존별 카운트 계산
  const zoneCounts: Record<string, number> = {}
  let totalCount = 0
  
  for (const zone of Object.keys(zones)) {
    zoneCounts[zone] = 0
    ratios[zone] = 0
  }
  
  for (const value of values) {
    let val = value
    if (treatZeroAsNan && val === 0) val = null as any
    
    const zone = labelByZone(val, zones)
    if (zone) {
      zoneCounts[zone]++
      totalCount++
    }
  }
  
  // 비율 계산
  if (totalCount > 0) {
    for (const [zone, count] of Object.entries(zoneCounts)) {
      ratios[zone] = Math.round((count / totalCount) * 100)
    }
  }
  
  // 드리프트 보정
  const drift = 100 - Object.values(ratios).reduce((sum, r) => sum + r, 0)
  const lastZone = Object.keys(ratios)[Object.keys(ratios).length - 1]
  ratios[lastZone] = Math.max(0, ratios[lastZone] + drift)
  
  return ratios
}

/**
 * 피크 파워 계산 (Python 스크립트와 동일)
 */
function peakPower(watts: number[], windowSec: number, dt: number[], totalTime: number): number | null {
  if (watts.length === 0) return null
  if (windowSec > totalTime) return null
  
  const arr = watts
  const arrDt = dt
  const medianDt = arrDt.slice().sort((a, b) => a - b)[Math.floor(arrDt.length / 2)]
  
  const n = Math.max(1, Math.min(Math.round(windowSec / medianDt), arr.length))
  
  let maxAvg = 0
  for (let i = 0; i <= arr.length - n; i++) {
    const window = arr.slice(i, i + n)
    const avg = window.reduce((sum, w) => sum + (w || 0), 0) / n
    if (avg > maxAvg) {
      maxAvg = avg
    }
  }
  
  return Math.round(maxAvg)
}

// =========================================
// RiderStyle 판정 로직
// =========================================
function determineRiderStyle(data: {
  distance: number
  elevation: number
  averageSpeed: number
  averageWatts?: number
  maxWatts?: number
  averageCadence?: number
}): RiderStyle {
  const dist = data.distance
  const elev = data.elevation
  const elevPerKm = elev / (dist || 1)
  const speed = data.averageSpeed
  const avgW = data.averageWatts || 0
  const maxW = data.maxWatts || 0
  const cad = data.averageCadence || 0

  if (dist < 20 || speed < 20) {
    return { icon: '??', name: '초보형 (입문형 라이더)', desc: '짧은 주행과 불안정한 리듬으로 기초 체력 단계' }
  }
  if (maxW > 700 && dist < 50) {
    return { icon: '??', name: '스프린터 (단거리가속형)', desc: '순간 폭발력이 뛰어난 스프린트 중심 주행' }
  }
  if (elevPerKm >= 15 && elev >= 800) {
    return { icon: '??', name: '클라이머 (산악형)', desc: '오르막 구간에서 낮은 케이던스로 꾸준히 힘을 낸 주행' }
  }
  if (dist >= 40 && dist <= 80 && maxW > 400 && elevPerKm >= 10) {
    return { icon: '??', name: '펀처 (순간폭발형)', desc: '짧은 언덕과 순간 강도 대응이 돋보이는 주행' }
  }
  if (elevPerKm < 10 && dist >= 60 && speed >= 26) {
    return { icon: '?', name: '롤러/도메스틱 (평지장거리형)', desc: '평지 장거리에서 안정적 페이스 유지' }
  }
  if (dist >= 100) {
    return { icon: '??', name: '브레이커웨이 스페셜리스트 (장거리형)', desc: '장거리 독주와 꾸준한 페이스 유지' }
  }
  if (dist >= 20 && dist <= 60 && avgW > 0.9 * (maxW || avgW) && cad >= 80) {
    return { icon: '???', name: 'TT 스페셜리스트 (파워유지형)', desc: '에어로 자세로 일정 파워를 유지한 주행' }
  }
  return { icon: '??', name: '올라운더 (밸런스형)', desc: '언덕과 평지 모두 균형 잡힌 주행' }
}


// =========================================
// 메인 분석 함수
// =========================================
export async function analyzeStreamData(streamsData: any): Promise<AnalysisResult> {
  console.log('?? 스트림 데이터 분석 시작...')

  
  const streams: StreamData = {}
  const streamKeys = ['time', 'distance', 'altitude', 'velocity_smooth', 'watts', 'heartrate', 'cadence', 'moving']
  for (const key of streamKeys) {
    if (streamsData[key]) {
      streams[key as keyof StreamData] = streamsData[key].data || []
    }
  }

  const maxLength = Math.max(...Object.values(streams).map(arr => arr?.length || 0))
  if (maxLength === 0) throw new Error('스트림 데이터가 없습니다')

  for (const key of streamKeys) {
    if (streams[key as keyof StreamData]) {
      const arr = streams[key as keyof StreamData] as number[]
      while (arr.length < maxLength) arr.push(arr[arr.length - 1] || 0)
    } else {
      streams[key as keyof StreamData] = new Array(maxLength).fill(0)
    }
  }

  const dt: number[] = []
  for (let i = 0; i < maxLength; i++) {
    if (i === 0) dt.push(1)
    else {
      const timeDiff = (streams.time![i] - streams.time![i - 1]) || 1
      dt.push(Math.max(1, timeDiff))
    }
  }

  const totalTime = streams.time![streams.time!.length - 1] || 0

  let powerZoneRatios: Record<string, number>
  let ftp20: number | null = null
  let ftp60: number | null = null

  if (!streams.watts || streams.watts.every(w => !w)) {
    console.log('? 파워: 추정값으로 대체')
    streams.watts = estimatePower(streams.distance!, streams.altitude!, dt, streams.velocity_smooth)
    
    // FTP 추정
    const ftpResult = estimateFtpWithoutPower(
      streams.distance!, 
      streams.altitude!, 
      dt, 
      streams.velocity_smooth, 
      totalTime, 
      estimatePower
    )
    ftp20 = ftpResult.ftp20
    ftp60 = ftpResult.ftp60
  } else {
    ftp20 = computeFtpFromPower(streams.watts, dt, totalTime, 20 * 60, 0.95)
    ftp60 = computeFtpFromPower(streams.watts, dt, totalTime, 60 * 60, 1.0)
  }

  // 스무딩 옵션 적용
  if (SMOOTH_POWER && streams.watts) {
    console.log('? 파워: 스무딩 적용')
    const powerSmooth = rollingMean(streams.watts, 15, true, 1)
    streams.watts = medianFilter(powerSmooth, 9)
  }
  
  // 존 선택 (설정 기반)
  const zonesForPower = USE_ABSOLUTE_ZONES ? POWER_ZONES : POWER_ZONES_FTP
  
  // 존 비율 계산 (설정 기반)
  if (ZONE_METHOD === 'count') {
    powerZoneRatios = countBasedZoneRatios(streams.watts!, zonesForPower, true)
  } else {
    powerZoneRatios = timeBasedZoneRatios(streams.watts!, dt, zonesForPower, true)
  }
  
  if (!streams.heartrate || streams.heartrate.every(h => !h)) {
    console.log('?? 심박: 추정값으로 대체')
    streams.heartrate = estimateHrFromGpsAlt(streams.distance!, streams.altitude!, dt)
  }
  
  if (!streams.cadence || streams.cadence.every(c => !c)) {
    console.log('?? 케이던스: 추정값으로 대체')
    streams.cadence = estimateCadenceFromFeatures(streams.velocity_smooth!, streams.altitude!, streams.distance!)
  }
  
  // 심박존 비율 계산 (설정 기반)
  let hrZoneRatios: Record<string, number>
  if (ZONE_METHOD === 'count') {
    hrZoneRatios = countBasedZoneRatios(streams.heartrate!, HR_ZONES, true)
  } else {
    hrZoneRatios = timeBasedZoneRatios(streams.heartrate!, dt, HR_ZONES, true)
  }
  
  // 분석 실행

  const results: AnalysisResult = {
  총거리: computeTotalDistanceKm(streams.distance!),
  총고도: computeTotalElevationGain(streams.altitude!),
  평균속도: computeSpeedStats(streams.velocity_smooth!).avg,
  최고속도: computeSpeedStats(streams.velocity_smooth!).max,
  평균파워: computeAvgPowerMovingIncludingZeros(
    streams.watts!,
    streamsData.moving?.data,
    streams.velocity_smooth
   ),
  최대파워: computePowerStats(streams.watts!).max,
  최고심박수: computeHrMax(streams.heartrate!),
  평균케이던스: computeCadenceAvg(streams.cadence!),
  powerZoneRatios: powerZoneRatios,
  hrZoneRatios: hrZoneRatios,
  peakPowers: {},
  hrZoneAverages: {},
  ftp20: ftp20,
  ftp60: ftp60,
  riderStyle: determineRiderStyle({
    distance: computeTotalDistanceKm(streams.distance!),
    elevation: computeTotalElevationGain(streams.altitude!),
    averageSpeed: computeSpeedStats(streams.velocity_smooth!).avg,
    averageWatts: computeAvgPowerMovingIncludingZeros(
      streams.watts!,
      streamsData.moving?.data,
      streams.velocity_smooth
    ),
    maxWatts: computePowerStats(streams.watts!).max,
    averageCadence: computeCadenceAvg(streams.cadence!)
  }),
  courseName: null
 }

  // 피크 파워 계산
  const peakWindows = [
    { sec: 5, label: '5s' },
    { sec: 60, label: '1min' },
    { sec: 120, label: '2min' },
    { sec: 300, label: '5min' },
    { sec: 600, label: '10min' },
    { sec: 1800, label: '30min' },
    { sec: 3600, label: '1h' }
  ]
  
  for (const { sec, label } of peakWindows) {
    results.peakPowers[label] = peakPower(streams.watts!, sec, dt, totalTime)
  }
  
  // 심박존 평균 계산
  for (const [zone, [low, high]] of Object.entries(HR_ZONES)) {
    const hrInZone = streams.heartrate!.filter(hr => hr >= low && hr <= high)
    results.hrZoneAverages[zone] = hrInZone.length > 0 ? Math.round(hrInZone.reduce((sum, hr) => sum + hr, 0) / hrInZone.length) : null
  }
  
  console.log('? 스트림 데이터 분석 완료')
  
  // Python 스크립트와 동일한 출력 형식
  console.log('??총거리:', results.총거리, 'km')
  console.log('??총고도:', results.총고도, 'm')
  console.log('??평균속도:', results.평균속도, 'km/h')
  console.log('??최고속도:', results.최고속도, 'km/h')
  console.log('??평균파워:', results.평균파워, 'W')
  console.log('??최대파워:', results.최대파워, 'W')
  console.log('?20min FTP:', results.ftp20 || 'N/A', 'W')
  console.log('?60min FTP:', results.ftp60 || 'N/A', 'W')
  console.log('??최고심박수:', results.최고심박수, 'bpm')
  console.log('??평균케이던스:', results.평균케이던스, 'rpm\n')
  
  console.log('?? 파워·심박 존 훈련 분석')
  for (const z of Object.keys(POWER_ZONES)) {
    console.log(`${z}: P ${results.powerZoneRatios[z]}% / H ${results.hrZoneRatios[z]}%`)
  }
  
  console.log('\n? 피크파워 분석')
  const peakPowerStrings = Object.entries(results.peakPowers).map(([label, val]) => 
    `${label}: ${val === null ? 'N/A' : val + 'W'}`
  )
  console.log(peakPowerStrings.join(' / '))
  
  console.log('\n?? 심박존 평균 분석 (AI추측)')
  for (const z of Object.keys(HR_ZONES)) {
    const val = results.hrZoneAverages[z]
    console.log(`${z}: ${val === null ? 'N/A' : val + ' bpm'}`)
  }
  
   // 코스명 생성
  if (streamsData.latlng?.data) {
    const latlngs = streamsData.latlng.data.map((d: number[]) => ({
      lat: d[0],
      lon: d[1]
    }))
    results.courseName = await generateCourseName(latlngs, results.총거리)
  }

  console.log('✅ 스트림 데이터 분석 완료')
  return results
}
