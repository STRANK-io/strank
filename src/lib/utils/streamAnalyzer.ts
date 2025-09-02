/**
 * Strava 스트림 데이터 분석 유틸리티
 * Python 스크립트를 TypeScript로 포팅
 */

interface StreamData {
  time?: number[]
  distance?: number[]
  altitude?: number[]
  velocity_smooth?: number[]
  watts?: number[]
  heartrate?: number[]
  cadence?: number[]
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
}

// 파워 존 정의 (Python 스크립트와 동일)
const POWER_ZONES = {
  Z1: [0, 110],
  Z2: [111, 150],
  Z3: [151, 180],
  Z4: [181, 210],
  Z5: [211, 2000],
}

// 심박 존 정의 (Python 스크립트와 동일)
const HR_ZONES = {
  Z1: [0, 129],
  Z2: [130, 148],
  Z3: [149, 168],
  Z4: [169, 180],
  Z5: [181, 250],
}

/**
 * 파워 추정 함수
 */
function estimatePower(
  speedMps: number[],
  altitudeM: number[],
  dt: number[],
  mass = 75,
  cda = 0.3,
  cr = 0.004,
  rho = 1.226,
  g = 9.81
): number[] {
  const power: number[] = []
  
  for (let i = 0; i < speedMps.length; i++) {
    const speed = speedMps[i] || 0
    const alt = altitudeM[i] || 0
    const prevAlt = i > 0 ? altitudeM[i - 1] || 0 : alt
    const deltaTime = dt[i] || 1
    
    const dAlt = alt - prevAlt
    const slope = dAlt / (deltaTime * speed + 1e-6)
    
    const fAero = 0.5 * rho * cda * speed * speed
    const fRoll = mass * g * cr
    const fGrav = mass * g * slope
    
    const powerValue = (fAero + fRoll + fGrav) * speed
    power.push(Math.max(0, powerValue))
  }
  
  return power
}

/**
 * 심박수 추정 함수
 */
function estimateHrFromPower(power: number[], ftp = 250, hrMax = 190): number[] {
  return power.map(p => {
    const rel = p / ftp
    return Math.min(hrMax, 100 + (hrMax - 100) * rel)
  })
}

/**
 * 케이던스 추정 함수
 */
function estimateCadenceFromSpeed(speedMps: number[]): number[] {
  return speedMps.map(speed => {
    const speedKmh = speed * 3.6
    if (speedKmh < 15) return 70
    if (speedKmh < 25) return 80
    if (speedKmh < 35) return 90
    return 100
  })
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
 * 피크 파워 계산
 */
function peakPower(watts: number[], windowSec: number, dt: number[]): number | null {
  if (watts.length === 0) return null
  
  const medianDt = dt.sort((a, b) => a - b)[Math.floor(dt.length / 2)]
  const n = Math.max(1, Math.min(Math.round(windowSec / medianDt), watts.length))
  
  let maxPower = 0
  for (let i = 0; i <= watts.length - n; i++) {
    const window = watts.slice(i, i + n)
    const avgPower = window.reduce((sum, w) => sum + (w || 0), 0) / n
    maxPower = Math.max(maxPower, avgPower)
  }
  
  return Math.round(maxPower)
}

/**
 * 메인 분석 함수
 */
export function analyzeStreamData(streamsData: any): AnalysisResult {
  console.log('🔍 스트림 데이터 분석 시작...')
  
  // 스트림 데이터 추출
  const streams: StreamData = {}
  const streamKeys = ['time', 'distance', 'altitude', 'velocity_smooth', 'watts', 'heartrate', 'cadence']
  
  for (const key of streamKeys) {
    if (streamsData[key]) {
      streams[key as keyof StreamData] = streamsData[key].data || []
    }
  }
  
  // 데이터 길이 확인 및 정규화
  const maxLength = Math.max(...Object.values(streams).map(arr => arr?.length || 0))
  if (maxLength === 0) {
    throw new Error('스트림 데이터가 없습니다')
  }
  
  // 모든 배열을 같은 길이로 맞춤
  for (const key of streamKeys) {
    if (streams[key as keyof StreamData]) {
      const arr = streams[key as keyof StreamData] as number[]
      while (arr.length < maxLength) {
        arr.push(arr[arr.length - 1] || 0)
      }
    } else {
      streams[key as keyof StreamData] = new Array(maxLength).fill(0)
    }
  }
  
  // 시간 차이 계산
  const dt: number[] = []
  for (let i = 0; i < maxLength; i++) {
    if (i === 0) {
      dt.push(1)
    } else {
      const timeDiff = (streams.time![i] - streams.time![i - 1]) || 1
      dt.push(Math.max(1, timeDiff))
    }
  }
  
  // 누락된 데이터 추정
  if (!streams.watts || streams.watts.every(w => !w)) {
    console.log('⚡ 파워: 추정값으로 대체')
    streams.watts = estimatePower(streams.velocity_smooth!, streams.altitude!, dt)
  }
  
  if (!streams.heartrate || streams.heartrate.every(h => !h)) {
    console.log('❤️ 심박: 추정값으로 대체')
    streams.heartrate = estimateHrFromPower(streams.watts!)
  }
  
  if (!streams.cadence || streams.cadence.every(c => !c)) {
    console.log('🔄 케이던스: 추정값으로 대체')
    streams.cadence = estimateCadenceFromSpeed(streams.velocity_smooth!)
  }
  
  // 분석 실행
  const results: AnalysisResult = {
    총거리: computeTotalDistanceKm(streams.distance!),
    총고도: computeTotalElevationGain(streams.altitude!),
    평균속도: computeSpeedStats(streams.velocity_smooth!).avg,
    최고속도: computeSpeedStats(streams.velocity_smooth!).max,
    평균파워: computePowerStats(streams.watts!).avg,
    최대파워: computePowerStats(streams.watts!).max,
    최고심박수: computeHrMax(streams.heartrate!),
    평균케이던스: computeCadenceAvg(streams.cadence!),
    powerZoneRatios: timeBasedZoneRatios(streams.watts!, dt, POWER_ZONES, true),
    hrZoneRatios: countBasedZoneRatios(streams.heartrate!, HR_ZONES, true),
    peakPowers: {},
    hrZoneAverages: {}
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
    results.peakPowers[label] = peakPower(streams.watts!, sec, dt)
  }
  
  // 심박존 평균 계산
  for (const [zone, [low, high]] of Object.entries(HR_ZONES)) {
    const hrInZone = streams.heartrate!.filter(hr => hr >= low && hr <= high)
    results.hrZoneAverages[zone] = hrInZone.length > 0 ? Math.round(hrInZone.reduce((sum, hr) => sum + hr, 0) / hrInZone.length) : null
  }
  
  console.log('✅ 스트림 데이터 분석 완료')
  
  // Python 스크립트와 동일한 출력 형식
  console.log('🚴총거리:', results.총거리, 'km')
  console.log('🚵총고도:', results.총고도, 'm')
  console.log('🪫평균속도:', results.평균속도, 'km/h')
  console.log('🔋최고속도:', results.최고속도, 'km/h')
  console.log('🦵평균파워:', results.평균파워, 'W')
  console.log('🦿최대파워:', results.최대파워, 'W')
  console.log('❤️최고심박수:', results.최고심박수, 'bpm')
  console.log('💫평균케이던스:', results.평균케이던스, 'rpm\n')
  
  console.log('📈 파워·심박 존 훈련 분석')
  for (const z of Object.keys(POWER_ZONES)) {
    console.log(`${z}: P ${results.powerZoneRatios[z]}% / H ${results.hrZoneRatios[z]}%`)
  }
  
  console.log('\n⚡ 피크파워 분석')
  const peakPowerStrings = Object.entries(results.peakPowers).map(([label, val]) => 
    `${label}: ${val === null ? 'N/A' : val + 'W'}`
  )
  console.log(peakPowerStrings.join(' / '))
  
  console.log('\n❤️ 심박존 평균 분석 (AI추측)')
  for (const z of Object.keys(HR_ZONES)) {
    const val = results.hrZoneAverages[z]
    console.log(`${z}: ${val === null ? 'N/A' : val + ' bpm'}`)
  }
  
  return results
}
