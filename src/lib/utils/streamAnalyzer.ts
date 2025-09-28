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
  courseName?: string | null
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

  const feature =
    data.name ||
    data.extratags?.temple ||
    data.extratags?.historic ||
    data.extratags?.tourism ||
    data.extratags?.peak ||
    data.extratags?.park ||
    data.extratags?.river ||
    data.extratags?.water ||
    data.extratags?.bridge ||
    data.extratags?.cycleway ||
    null
  
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
    null

  if (feature && admin) {
    if (feature === admin) return feature
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
  const segmentCount = getSegmentCount(distanceKm)
  const keyPoints = splitCourseByIndex(latlngs, segmentCount)
  const names = await Promise.all(keyPoints.map(reverseGeocode))

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
// 유틸 함수 (보정 포함)
// =========================================
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

// =========================================
// 파워 추정 (보정 버전)
// =========================================
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

  // 🔧 속도 안정화
  let speed: number[] = []
  if (velocitySmooth && velocitySmooth.some(v => v > 0)) {
    speed = velocitySmooth.map((vs, i) => {
      const sdVal = speedFromDist[i] || 0
      const s = (vs || 0 + sdVal) / 2
      return Math.min(Math.max(s, 0), 15)
    })
  } else {
    speed = speedFromDist.map(s => Math.min(Math.max(s, 0), 15))
    speed = medianFilter(speed, 5)
  }

  const altSmooth = rollingMean(altitudeM, 8, true, 1)
  const dAlt: number[] = []
  for (let i = 0; i < altSmooth.length; i++) {
    const diff = i === 0 ? 0 : altSmooth[i] - altSmooth[i - 1]
    dAlt.push(Math.abs(diff) > 1.0 ? 0 : diff)
  }

  const power: number[] = []
  for (let i = 0; i < speed.length; i++) {
    const s = speed[i]
    const deltaTime = dt[i] || 1
    const gradPower = (mass * g * dAlt[i]) / deltaTime
    const rollPower = mass * g * cr * s
    const aeroPower = 0.35 * (0.5 * rho * cda * Math.pow(s, 3)) // 🔧 수정

    let totalPower = (gradPower * 1.3) + rollPower + aeroPower // 🔧 수정
    totalPower = Math.max(0, Math.min(2000, totalPower))
    power.push(totalPower)
  }

  return rollingMean(power, 15, true, 1) // 🔧 스무딩 강화
}

// =========================================
// 케이던스 추정 (보정 버전)
// =========================================
function estimateCadenceFromFeatures(
  speedMps: number[],
  altitudeM: number[],
  distanceM: number[],
  baseRpm = 65,   // 🔧 기본값 상향
  alpha = 4.0,    // 🔧 속도 기여도 강화
  beta = -50.0    // 🔧 경사도 영향 완화
): number[] {
  const s = speedMps.map(sp => sp || 0)

  const dAlt: number[] = []
  for (let i = 0; i < altitudeM.length; i++) {
    if (i === 0) dAlt.push(0)
    else dAlt.push(altitudeM[i] - altitudeM[i - 1])
  }

  const dDist: number[] = []
  for (let i = 0; i < distanceM.length; i++) {
    if (i === 0) dDist.push(1)
    else dDist.push(distanceM[i] - distanceM[i - 1])
  }

  const gradient = dDist.map((dd, i) => {
    const ddVal = dd || 1
    const dAltVal = dAlt[i] || 0
    return Math.max(-0.15, Math.min(0.15, dAltVal / (ddVal + 1e-6)))
  })

  return s.map((speed, i) => {
    const speedKmh = speed * 3.6
    const grad = gradient[i] || 0
    const cad = baseRpm + alpha * (speedKmh / 20) + beta * grad
    return Math.max(40, Math.min(110, Math.round(cad))) // 🔧 수정
  })
}

// =========================================
// 파워 스케일링
// =========================================
function rescalePower(watts: number[], ftpReset = FTP_RESET): number[] {
  const avg = watts.reduce((a, b) => a + b, 0) / (watts.length || 1)
  if (avg <= 0) return watts
  const scale = ftpReset / avg
  return watts.map(w => Math.round(w * scale))
}

// =========================================
// 나머지 보조 함수들 (거리, 고도, 속도, 심박 등 계산)
// =========================================
function computeTotalDistanceKm(distanceM: number[]): number {
  if (distanceM.length < 2) return 0
  const validDistances = distanceM.filter(d => d != null)
  if (validDistances.length < 2) return 0
  return Math.round((validDistances[validDistances.length - 1] - validDistances[0]) / 1000)
}

function computeTotalElevationGain(altitudeM: number[]): number {
  if (altitudeM.length < 2) return 0
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
    if (diff >= 0.12) {
      totalGain += diff
    }
  }
  return Math.round(totalGain)
}

function computeSpeedStats(speedMps: number[]): { avg: number; max: number } {
  const validSpeeds = speedMps.filter(s => s != null && s > 0).map(s => s * 3.6)
  if (validSpeeds.length === 0) return { avg: 0, max: 0 }
  const avg = validSpeeds.reduce((sum, s) => sum + s, 0) / validSpeeds.length
  const max = Math.max(...validSpeeds)
  return { avg: Math.round(avg), max: Math.round(max) }
}

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
  let sum = 0, cnt = 0
  for (let i = 0; i < N; i++) {
    if (movingMask[i]) {
      const w = typeof watts[i] === 'number' && isFinite(watts[i]) ? watts[i] : 0
      sum += w
      cnt++
    }
  }
  return cnt > 0 ? Math.round(sum / cnt) : 0
}

function computePowerStats(watts: number[]): { avg: number; max: number } {
  const validWatts = watts.filter(w => w != null && w > 0)
  if (validWatts.length === 0) return { avg: 0, max: 0 }
  const avg = validWatts.reduce((sum, w) => sum + w, 0) / validWatts.length
  const max = Math.max(...validWatts)
  return { avg: Math.round(avg), max: Math.round(max) }
}

function computeHrMax(hr: number[]): number {
  const validHr = hr.filter(h => h != null && h > 0)
  return validHr.length > 0 ? Math.round(Math.max(...validHr)) : 0
}

function computeCadenceAvg(cadence: number[]): number {
  const validCadence = cadence.filter(c => c != null && c > 0)
  if (validCadence.length === 0) return 0
  const avg = validCadence.reduce((sum, c) => sum + c, 0) / validCadence.length
  return Math.round(avg)
}

// =========================================
// RiderStyle 판정 (원본 그대로)
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
    return { icon: '🚲', name: '초보형 (입문형 라이더)', desc: '짧은 주행과 불안정한 리듬으로 기초 체력 단계' }
  }
  if (maxW > 700 && dist < 50) {
    return { icon: '⚡', name: '스프린터 (단거리가속형)', desc: '순간 폭발력이 뛰어난 스프린트 중심 주행' }
  }
  if (elevPerKm >= 15 && elev >= 800) {
    return { icon: '⛰️', name: '클라이머 (산악형)', desc: '오르막 구간에서 낮은 케이던스로 꾸준히 힘을 낸 주행' }
  }
  if (dist >= 40 && dist <= 80 && maxW > 400 && elevPerKm >= 10) {
    return { icon: '💥', name: '펀처 (순간폭발형)', desc: '짧은 언덕과 순간 강도 대응이 돋보이는 주행' }
  }
  if (elevPerKm < 10 && dist >= 60 && speed >= 26) {
    return { icon: '🚴', name: '롤러/도메스틱 (평지장거리형)', desc: '평지 장거리에서 안정적 페이스 유지' }
  }
  if (dist >= 100) {
    return { icon: '🏁', name: '브레이커웨이 스페셜리스트 (장거리형)', desc: '장거리 독주와 꾸준한 페이스 유지' }
  }
  if (dist >= 20 && dist <= 60 && avgW > 0.9 * (maxW || avgW) && cad >= 80) {
    return { icon: '⏱️', name: 'TT 스페셜리스트 (파워유지형)', desc: '에어로 자세로 일정 파워를 유지한 주행' }
  }
  return { icon: '🌐', name: '올라운더 (밸런스형)', desc: '언덕과 평지 모두 균형 잡힌 주행' }
}

// =========================================
// 메인 분석 함수
// =========================================
export async function analyzeStreamData(streamsData: any): Promise<AnalysisResult> {
  console.log('🚴 스트림 데이터 분석 시작...')

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

  let ftp20: number | null = null
  let ftp60: number | null = null

  if (!streams.watts || streams.watts.every(w => !w)) {
    console.log('⚡ 파워: 추정+보정 적용')
    let est = estimatePower(streams.distance!, streams.altitude!, dt, streams.velocity_smooth)
    est = rescalePower(est, FTP_RESET)
    streams.watts = est
  }

  if (!streams.cadence || streams.cadence.every(c => !c)) {
    console.log('⏱️ 케이던스: 추정 보정 적용')
    streams.cadence = estimateCadenceFromFeatures(streams.velocity_smooth!, streams.altitude!, streams.distance!)
  }

  const zonesForPower = USE_ABSOLUTE_ZONES ? POWER_ZONES : POWER_ZONES_FTP
  const powerZoneRatios = ZONE_METHOD === 'count'
    ? countBasedZoneRatios(streams.watts!, zonesForPower, true)
    : timeBasedZoneRatios(streams.watts!, dt, zonesForPower, true)

  const hrZoneRatios = ZONE_METHOD === 'count'
    ? countBasedZoneRatios(streams.heartrate!, HR_ZONES, true)
    : timeBasedZoneRatios(streams.heartrate!, dt, HR_ZONES, true)

  const results: AnalysisResult = {
    총거리: computeTotalDistanceKm(streams.distance!),
    총고도: computeTotalElevationGain(streams.altitude!),
    평균속도: computeSpeedStats(streams.velocity_smooth!).avg,
    최고속도: computeSpeedStats(streams.velocity_smooth!).max,
    평균파워: computeAvgPowerMovingIncludingZeros(streams.watts!, streamsData.moving?.data, streams.velocity_smooth),
    최대파워: computePowerStats(streams.watts!).max,
    최고심박수: computeHrMax(streams.heartrate!),
    평균케이던스: computeCadenceAvg(streams.cadence!),
    powerZoneRatios,
    hrZoneRatios,
    peakPowers: {},
    hrZoneAverages: {},
    ftp20,
    ftp60,
    riderStyle: determineRiderStyle({
      distance: computeTotalDistanceKm(streams.distance!),
      elevation: computeTotalElevationGain(streams.altitude!),
      averageSpeed: computeSpeedStats(streams.velocity_smooth!).avg,
      averageWatts: computeAvgPowerMovingIncludingZeros(streams.watts!, streamsData.moving?.data, streams.velocity_smooth),
      maxWatts: computePowerStats(streams.watts!).max,
      averageCadence: computeCadenceAvg(streams.cadence!)
    }),
    courseName: null
  }

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
