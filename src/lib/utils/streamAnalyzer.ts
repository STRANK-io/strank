import { getZoneInfo } from '@/lib/utils/zone';
import { createServiceRoleClient } from '@/lib/supabase/server';

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
  ftp60: number | null
  riderStyle: RiderStyle
  courseName?: string | null
}

// =========================================
// 존 정의
// =========================================
const POWER_ZONES = { // FTP : 220W 기준
  Z1: [0, 110] as [number, number],
  Z2: [111, 191] as [number, number],
  Z3: [192, 209] as [number, number],
  Z4: [210, 220] as [number, number],
  Z5: [221, 244] as [number, number],
  Z6: [245, 660] as [number, number],
  Z7: [661, 2500] as [number, number],
}

const POWER_ZONES_FTP = {
  Z1: [0, Math.round(FTP_RESET * 0.55)] as [number, number],
  Z2: [Math.round(FTP_RESET * 0.56), Math.round(FTP_RESET * 0.75)] as [number, number],
  Z3: [Math.round(FTP_RESET * 0.76), Math.round(FTP_RESET * 0.90)] as [number, number],
  Z4: [Math.round(FTP_RESET * 0.91), Math.round(FTP_RESET * 1.05)] as [number, number],
  Z5: [Math.round(FTP_RESET * 1.06), Math.round(FTP_RESET * 1.20)] as [number, number],
  Z6: [Math.round(FTP_RESET * 1.21), Math.round(FTP_RESET * 1.50)] as [number, number],
  Z7: [Math.round(FTP_RESET * 1.51), 2500] as [number, number],
}

const HR_ZONES = { // 심박수 : 180bpm 기준
  Z1: [0, 117] as [number, number],
  Z2: [118, 135] as [number, number],
  Z3: [136, 153] as [number, number],
  Z4: [154, 171] as [number, number],
  Z5: [172, 250] as [number, number],
}

// =========================================
// 코스명 유틸 함수 (Nominatim + Overpass + 반환점 + 중복축약 + 잡음제거)
// =========================================

// 코스 길이에 따라 샘플링 포인트 개수 결정
function getSegmentCount(distanceKm: number): number {
  if (distanceKm <= 5) return 2
  if (distanceKm <= 30) return 4
  if (distanceKm <= 80) return 5
  return 6
}

// 반환점 감지 (왕복 루트)
function detectSpecialPoints(latlngs: { lat: number; lon: number }[]): number[] {
  if (latlngs.length < 20) return []
  const mid = Math.floor(latlngs.length / 2)
  const dist = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
    Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lon - b.lon, 2))

  const start = latlngs[0]
  const midPoint = latlngs[mid]
  const end = latlngs[latlngs.length - 1]

  const result: number[] = []
  if (dist(start, midPoint) < 0.003) result.push(mid) // 반환점 감지 (약 300m)
  if (dist(start, end) < 0.003) result.push(latlngs.length - 1) // 종점이 거의 동일
  return result
}

// GPS 경로에서 일정 간격 포인트 추출
function splitCourseByIndex(latlngs: { lat: number; lon: number }[], segmentCount = 6) {
  if (latlngs.length <= segmentCount) return latlngs
  const step = Math.floor(latlngs.length / (segmentCount - 1))
  return Array.from({ length: segmentCount }, (_, i) =>
    latlngs[Math.min(i * step, latlngs.length - 1)]
  )
}

// ✅ 비정상 좌표 감지 (글로벌 대응)
function isInvalidLocation(lat: number, lon: number): boolean {
  if (isNaN(lat) || isNaN(lon)) return true
  // (1) GPS 없음 or 0,0 근처
  if (Math.abs(lat) < 1 && Math.abs(lon) < 1) return true
  // (2) 위도/경도 유효 범위 벗어남
  if (lat < -60 || lat > 80) return true
  if (lon < -180 || lon > 180) return true
  // (3) 인구 희박/비현실적 지역 (남극, 사막 등)
  if (lat > 10 && lat < 30 && lon > 30 && lon < 60) return true // 대략 아라비아 반도
  return false
}

// 🔎 잡음 제거 유틸
function sanitizeName(name?: string | null): string | null {
  if (!name) return null
  const trimmed = name.trim()

  if (trimmed.toUpperCase() === "N/A") return null
  if (/^\+?\d{6,}$/.test(trimmed.replace(/\s+/g, ""))) return null // 전화번호
  if (/^\D*\d{3,}$/.test(trimmed)) return null // 숫자 ID 기반 (예: "0501222551")
  if (trimmed.length < 2) return null // 너무 짧은 경우
  return trimmed
}

// Nominatim Reverse Geocoding
async function reverseGeocode(point: { lat: number; lon: number }): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${point.lat}&lon=${point.lon}&format=json&zoom=14&addressdetails=1&extratags=1`
    const res = await fetch(url, {
      headers: { "User-Agent": "STRANK/1.0 (support@strank.io)" },
    })
    const data = await res.json()

    
    // GPS 품질 확인
    if (isInvalidLocation(point.lat, point.lon)) {
      return "실내 트레이닝"
    }
    

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

    const picked = feature || admin
    return sanitizeName(picked) || "알 수 없음"
  } catch (e) {
    console.warn("⚠️ reverseGeocode 실패:", e)
    return "알 수 없음"
  }
}

// Overpass API
async function getNearbyPOIs(lat: number, lon: number, radius = 500): Promise<{name: string, tags: any}[]> {
  try {
    const query = `
      [out:json];
      (
        node(around:${radius},${lat},${lon})["name"];
        way(around:${radius},${lat},${lon})["name"];
        relation(around:${radius},${lat},${lon})["name"];
      );
      out center;`

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: { "User-Agent": "STRANK/1.0 (support@strank.io)" },
    })
    const data = await res.json()

    return data.elements
      .map((el: any) => ({ name: sanitizeName(el.tags?.name), tags: el.tags }))
      .filter((el: any) => el.name) // 잡음 제거된 이름만 유지
  } catch (e) {
    console.warn("⚠️ getNearbyPOIs 실패:", e)
    return []
  }
}

// POI 우선순위 선정 로직
function pickBestPOI(pois: {name: string | null, tags: any}[], baseName: string | null): string {
  if (!pois || pois.length === 0) return baseName || "알 수 없음"

  const scored = pois.map(p => {
    if (!p.name) return { ...p, score: 0 }
    let score = 0
    const name = p.name

    // 1. 최우선: 댐, 보, 산, 대교
    if (p.tags.man_made === "dam") score = 100
    else if (p.tags.waterway === "weir" || p.tags.man_made === "weir") score = 98
    else if (["peak","hill","ridge"].includes(p.tags.natural)) score = 95
    else if (p.tags.man_made === "bridge" && (name.includes("대교") || name.includes("Bridge"))) score = 90
    else if (p.tags.highway === "pass") score = 85

    // 2. 물 관련
    else if (p.tags.waterway === "river" || p.tags.natural === "water" || p.tags.place === "sea") score = 80
    else if (p.tags.water === "reservoir" || p.tags.landuse === "reservoir" || p.tags.water === "lake") score = 75

    // 3. 교통/역사적 거점
    else if (p.tags.railway === "station" && (p.tags.station === "subway" || p.tags.subway === "yes")) score = 78
    else if (p.tags.railway === "station") score = 72

    // 4. 관광/문화
    else if (["attraction","viewpoint","theme_park","zoo","museum"].includes(p.tags.tourism)) score = 70
    else if (p.tags.historic) score = 65
    else if (["temple","church","mosque","cathedral","shrine"].includes(p.tags.religion) || p.tags.amenity === "place_of_worship") score = 60

    // 5. 레저/자연
    else if (["park","garden","resort","stadium"].includes(p.tags.leisure)) score = 55
    else if (["cliff","volcano","cape","valley","forest"].includes(p.tags.natural)) score = 50

    // 6. 전망/기타
    else if (["tower","lighthouse"].includes(p.tags.man_made) || p.tags["tower:type"] === "observation") score = 45
    else if (p.tags.man_made === "pier" || p.tags.harbour) score = 40

    else score = 10

    return { ...p, score }
  }).filter(p => p.name)

  if (scored.length === 0) return baseName || "알 수 없음"
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.name || baseName || "알 수 없음"
}

// ✅ 최종 코스명 생성
export async function generateCourseName(
  latlngs: { lat: number; lon: number }[],
  distanceKm: number
): Promise<string> {
    // 🧭 실내 트레이닝 감지
  if (!latlngs || latlngs.length < 5 || distanceKm < 2) {
    return "실내 트레이닝"
  }

  // 🌍 좌표 검증
  const avgLat = latlngs.reduce((s, p) => s + p.lat, 0) / latlngs.length
  const avgLon = latlngs.reduce((s, p) => s + p.lon, 0) / latlngs.length
  if (isInvalidLocation(avgLat, avgLon)) {
    return "실내 트레이닝"
  }
  
  const segmentCount = getSegmentCount(distanceKm)

  // 반환점 + 균등 분할
  const specialIdx = detectSpecialPoints(latlngs)
  const specialPoints = specialIdx.map(i => latlngs[i])
  const basicPoints = splitCourseByIndex(latlngs, segmentCount)
  let keyPoints = [...specialPoints, ...basicPoints]

  // 최대 8개로 제한
  if (keyPoints.length > 8) {
    keyPoints = keyPoints.filter((_, i) => i % Math.ceil(keyPoints.length / 8) === 0)
  }

  const names = await Promise.all(
    keyPoints.map(async (pt) => {
      const baseName = sanitizeName(await reverseGeocode(pt))
      const pois = await getNearbyPOIs(pt.lat, pt.lon, 500)
      const best = pickBestPOI(pois, baseName)
      return sanitizeName(best)
    })
  )

  // 1) 알 수 없음 제거
  let filtered = names.filter((n): n is string => !!n && n !== "알 수 없음")

  // 2) 강한 중복 축약 (최대 2번까지만 허용)
  const seen: Record<string, number> = {}
  filtered = filtered.filter(n => {
    seen[n] = (seen[n] || 0) + 1
    return seen[n] <= 2
  })

  // 3) 연속 중복 제거
  const cleaned: string[] = []
  for (const n of filtered) {
    if (cleaned.length === 0 || cleaned[cleaned.length - 1] !== n) {
      cleaned.push(n)
    }
  }

  return cleaned.length > 0 ? cleaned.join(" → ") : "등록된 코스 없음"
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
    movingMask = velocity.map(v => (v || 0) > 1.0)
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
): { ftp60: number | null } {
  const wattsEst = estimatePowerFunc(distanceM, altitudeM, dt, velocitySmooth)
  const wattsSmooth = rollingMean(wattsEst, 15, true, 1)
  
  const ftp60 = computeFtpFromPower(wattsSmooth, dt, totalTime, 60 * 60, 1.0)
  
  return { ftp60 }
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
 * Z7 노이즈 필터링
 * - 600W 이상이 3초 이상 연속되지 않으면 제외(0 처리)
 */
function sanitizeZ7(
  values: number[],
  dt: number[],
  minWatt = 600,
  minDuration = 3
): number[] {
  const cleaned = [...values]
  let streak = 0

  for (let i = 0; i < values.length; i++) {
    const delta = dt[i] || 1

    if (values[i] >= minWatt) {
      streak += delta
      if (streak < minDuration) {
        cleaned[i] = 0 // 조건 불충족 → 제외
      }
    } else {
      streak = 0
    }
  }

  return cleaned
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
 * 파워 추정 함수 (v5.5 - 중속 강화 + 고속 감쇠 완화 + Z6 억제 강화)
 * - 평균파워 저평균 보정(60W 기준)
 * - 저속 감쇠 완화, 중속(20~35km/h) 강화
 * - Z6 과대 검출 시 자동 감쇠(0.85배)
 * - GPS 안정도 계산 포함
 */

function estimatePower(
  distanceM: number[],
  altitudeM: number[],
  dt: number[],
  velocitySmooth?: number[],
  mass = 75,
  cda = 0.6,
  cr = 0.007,
  rho = 1.226,
  g = 9.81
): { power: number[]; gpsStability: number; zone6Ratio: number } {
  if (distanceM.length < 2) return { power: [], gpsStability: 0, zone6Ratio: 0 }

  // -------------------------------
  // ① 거리 gap 보정
  // -------------------------------
  const distSmooth = rollingMean(distanceM, 5, true, 1)
  const dDist: number[] = []
  for (let i = 0; i < distSmooth.length; i++) {
    if (i === 0) dDist.push(0)
    else {
      const dd = distSmooth[i] - distSmooth[i - 1]
      const dtVal = Math.max(1, dt[i] || 1)
      if (dtVal > 5) dDist.push(0)
      else if (dd > 80) dDist.push((dDist[i - 1] || 0) * 0.2)
      else dDist.push(dd)
    }
  }

  // -------------------------------
  // ② 속도 계산 및 튐 보정
  // -------------------------------
  const gpsSpeed = dDist.map((dd, i) => dd / Math.max(1, dt[i] || 1))
  const rawSpeed =
    velocitySmooth && velocitySmooth.some(v => v > 0)
      ? velocitySmooth.map((vs, i) => (vs + gpsSpeed[i]) / 2)
      : gpsSpeed

  const limitedSpeed: number[] = []
  for (let i = 0; i < rawSpeed.length; i++) {
    if (i === 0) limitedSpeed.push(rawSpeed[i])
    else {
      const prev = limitedSpeed[i - 1]
      const accel = (rawSpeed[i] - prev) / Math.max(1, dt[i] || 1)
      if (Math.abs(accel) > 1.5) limitedSpeed.push(prev)
      else limitedSpeed.push(rawSpeed[i])
    }
  }

  const speed = rollingMean(medianFilter(limitedSpeed, 3), 5, true, 1)
    .map(s => Math.min(Math.max(s, 0), 22)) // 속도상한 22m/s (~79km/h)

  // GPS 안정도 평가
  let unstableCount = 0
  for (let i = 1; i < speed.length; i++) {
    const diff = Math.abs(speed[i] - speed[i - 1])
    if (diff > 2) unstableCount++
  }
  const gpsStability = 1 - unstableCount / speed.length

  // -------------------------------
  // ③ 고도 변화 반영
  // -------------------------------
  const altSmooth = rollingMean(altitudeM, 10, true, 1)
  const dAlt: number[] = []
  for (let i = 0; i < altSmooth.length; i++) {
    if (i === 0) dAlt.push(0)
    else {
      const diff = altSmooth[i] - altSmooth[i - 1]
      dAlt.push(Math.abs(diff) > 1.5 ? 0 : diff)
    }
  }

  // -------------------------------
  // ④ 파워 계산
  // -------------------------------
  const power: number[] = []
  for (let i = 0; i < speed.length; i++) {
    const s = speed[i]
    const deltaTime = Math.max(1, dt[i] || 1)
    let gradPower = (mass * g * dAlt[i]) / deltaTime
    gradPower *= 0.9

    const rollPower = mass * g * cr * s
    const aeroPower = 0.5 * rho * cda * Math.pow(s, 3)
    let totalPower = gradPower + rollPower + aeroPower

    const speedKmh = s * 3.6
    const minPower = 10 + 1.8 * speedKmh // 저속 하한 완화
    totalPower = Math.max(minPower, totalPower)

    // 속도별 감쇠 곡선
    if (speedKmh < 40) totalPower *= speedKmh / 40
    if (speedKmh < 15) totalPower *= 0.8
    if (speedKmh > 30) totalPower *= 0.85
    totalPower = Math.min(700, totalPower) // 최대 제한 살짝 완화

    if (i > 0) {
      const prev = power[i - 1] || totalPower
      totalPower = Math.min(totalPower, prev * 1.3)
    }

    power.push(totalPower)
  }

  // -------------------------------
  // ⑤ 평균 보정 (저평균 보정)
  // -------------------------------
  const avg = mean(power)
  let adjusted = power

  if (avg < 60) {
    const scale = Math.min(1.8, 60 / Math.max(avg, 1))
    adjusted = adjusted.map(p => p * scale)
  }

  // -------------------------------
  // ⑥ 최소 파워 하한 설정 (60W)
  // -------------------------------
  adjusted = adjusted.map(p => Math.max(60, p))

  // -------------------------------
  // ⑦ Z6 과대 검출 + 자동 감쇠
  // -------------------------------
  const thresholdZ6 = 0.85 * max(adjusted)
  const zone6Count = adjusted.filter(p => p >= thresholdZ6).length
  const zone6Ratio = zone6Count / adjusted.length

  if (zone6Ratio > 0.08) {
    adjusted = adjusted.map(p => p * 0.85)
  }

  // -------------------------------
  // ⑧ 스무딩 후 반환
  // -------------------------------
  return {
    power: rollingMean(adjusted, 5, true, 1), // 부드럽게
    gpsStability,
    zone6Ratio,
  }
}

// -------------------------------
// 유틸 함수
// -------------------------------
function mean(arr: number[]): number {
  const valid = arr.filter(v => !isNaN(v))
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
}

function max(arr: number[]): number {
  return arr.length ? Math.max(...arr.filter(v => !isNaN(v))) : 0
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
  baseRpm = 75,
  alpha = 3.0,
  beta = -80.0,
  gamma = -0.0005
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
    const start = Math.max(0, i - 2)
    const end = Math.min(altitudeM.length, i + 2)
    const window = altitudeM.slice(start, end).filter(a => a != null)
    smoothed.push(window.reduce((sum, a) => sum + a, 0) / window.length)
  }
  
  let totalGain = 0
  for (let i = 1; i < smoothed.length; i++) {
    const diff = smoothed[i] - smoothed[i - 1]
    if (diff >= 0.1) { 
      totalGain += diff
    }
  }
  
  return Math.round(totalGain)
}

/**
 * 속도 통계 계산 (센서 있음 vs GPS-only 구분)
 */
function computeSpeedStats(speedMps: number[]): { avg: number; max: number } {
  if (!speedMps || speedMps.length === 0) return { avg: 0, max: 0 }

  // km/h 변환
  const speedsKmh = speedMps.filter(s => s != null && s > 0).map(s => s * 3.6)
  if (speedsKmh.length === 0) return { avg: 0, max: 0 }

  // 간단한 센서 여부 판단
  const hasSensor = speedsKmh.length > 30 && speedsKmh.filter(s => s > 70).length === 0

  if (hasSensor) {
    // ✅ 속도센서 있음 → 원본 그대로
    const avg = speedsKmh.reduce((sum, s) => sum + s, 0) / speedsKmh.length
    const max = Math.max(...speedsKmh)
    return { avg: Math.round(avg), max: Math.round(max) }
  } else {
    // ⚠️ GPS-only → 강한 보정
    let smoothSpeeds = rollingMean(speedsKmh, 15, true, 1)

    // (1) 중앙값 필터 추가 적용
    smoothSpeeds = medianFilter(smoothSpeeds, 5)

    // (2) 비정상 가속(>10km/h 차이) 제거
    smoothSpeeds = smoothSpeeds.map((s, i) => {
      const prev = smoothSpeeds[Math.max(0, i - 1)]
      return Math.abs(s - prev) > 10 ? prev : s
    })
    

    // 평균속도: 스무딩 기반
    const avg = smoothSpeeds.reduce((sum, s) => sum + s, 0) / smoothSpeeds.length

    // 최고속도: 상위 5% 평균
    const sorted = [...smoothSpeeds].sort((a, b) => b - a)
    const topN = Math.max(1, Math.floor(sorted.length * 0.1))
    const topAvg = sorted.slice(0, topN).reduce((a, b) => a + b, 0) / topN

    const max = Math.min(Math.round(topAvg), 50) // GPS-only는 상한 50km/h

    return { avg: Math.round(avg), max }
  }
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
// RiderStyle 판정 로직 (최종 점수 미세조정)
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

  const scores: Record<string, number> = {
    beginner: 0,
    sprinter: 0,
    climber: 0,
    puncheur: 0,
    roller: 0,
    breaker: 0,
    tt: 0
  }

  // 1. 초보형 🚲
  if (speed < 20) scores.beginner += 3
  if (dist < 20) scores.beginner += 2
  if (avgW < 120) scores.beginner += 2
  if (cad < 70) scores.beginner += 1

  // 2. 스프린터 🔥 (평지 폭발력 중심)
  if (maxW > 600) scores.sprinter += 3
  if (avgW > 0 && maxW / avgW >= 4.5) scores.sprinter += 2
  if (avgW > 0 && maxW / avgW >= 3.5 && elevPerKm < 5) scores.sprinter += 1
  if (dist < 50) scores.sprinter += 1
  if (cad >= 90) scores.sprinter += 1
  if (speed >= 30) scores.sprinter += 2   // 추가: 고속 평지 주행 반영

    // --- ✅ 현실형 보정 (저강도 장거리 시 감점) ---
  if (avgW < 100) scores.sprinter -= 2          // 저강도 주행은 스프린터 아님
  if (speed < 25) scores.sprinter -= 1           // 속도 낮으면 감점
  if (dist >= 60 && avgW < 150) {                // 장거리 + 저파워 시
    scores.sprinter -= 2
    scores.roller += 2                           // 지속형 성향 강화
  }

  // 3. 클라이머 ⛰️
  if (elev >= 700) scores.climber += 3
  if (elevPerKm >= 12) scores.climber += 2
  if (speed < 25) scores.climber += 1
  if (cad < 75) scores.climber += 1

  // 4. 펀처 🚀 (언덕 + 순간폭발)
  if (elevPerKm >= 8) {
    if (maxW > 350) scores.puncheur += 3
    if (elevPerKm >= 8) scores.puncheur += 2
    if (dist >= 30 && dist <= 80) scores.puncheur += 1
    if (avgW > 0 && maxW / avgW >= 3.5) scores.puncheur += 2
  }

  // 5. 롤러 ⚡ (평지 장거리)
  if (dist >= 40) scores.roller += 3
  if (speed >= 25) scores.roller += 2
  if (elevPerKm < 7) scores.roller += 2
  if (avgW >= 120 && avgW <= 250) scores.roller += 1
  if (dist >= 80) scores.roller += 1              // 추가: 80km 이상 장거리 보정

  // 6. 브레이커웨이 🐺 (장거리 독주)
  if (dist >= 120) scores.breaker += 3
  if (speed >= 24) scores.breaker += 2
  if (avgW >= 120) scores.breaker += 2

  // 7. TT 🏋️ (파워 유지형)
  if (cad >= 75) scores.tt += 1
  if (avgW > 0 && avgW >= 0.85 * maxW) scores.tt += 3
  if (dist >= 20 && dist <= 60) scores.tt += 1
  if (speed >= 32) scores.tt += 2

  // --- 거리 보정 (짧은 주행은 롤러/브레이커 감점) ---
  if (dist < 20) {
    scores.roller -= 2      // 짧은 주행은 지속형 아님
    scores.breaker -= 3     // 장거리 독주는 불가능
    if (maxW > 400) scores.sprinter += 1 // 단거리 폭발력 보정
  }
  
  // --- 최고 점수 스타일 선택 ---
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]

  switch (best[0]) {
    case "beginner": return { icon: '🚲', name: '기초형 (입문형)', desc: '기초 체력 단계의 라이더' }
    case "sprinter": return { icon: '🔥', name: '스프린터 (단거리가속형)', desc: '평지에서 순간 폭발력이 뛰어난 주행' }
    case "climber": return { icon: '⛰️', name: '클라이머 (산악형)', desc: '고도 상승에 특화된 꾸준한 주행' }
    case "puncheur": return { icon: '🚀', name: '펀처 (순간폭발형)', desc: '언덕에서 폭발적 가속이 돋보이는 주행' }
    case "roller": return { icon: '⚡', name: '롤러/페이스메이커 (지속형)', desc: '페이스 유지력과 리듬감이 좋은 주행' }
    case "breaker": return { icon: '🐺', name: '브레이커웨이 (파워지속형)', desc: '파워지속 독주에 강한 주행' }
    case "tt": return { icon: '🏋️', name: 'TT 스페셜리스트 (파워유지형)', desc: '에어로 자세로 일정 파워를 유지한 주행' }
    default: return { icon: '🦾', name: '올라운더 (밸런스형)', desc: '특정 스타일에 치우치지 않은 균형 잡힌 주행' }
  }
}




// =========================================
// 메인 분석 함수
// =========================================
export async function analyzeStreamData(userId: string, streamsData: any): Promise<AnalysisResult> {
  console.log('🔍 스트림 데이터 분석 시작...')

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
  // streams 채운 직후에 거리/고도 확인
  const totalDistance = computeTotalDistanceKm(streams.distance!)
  const totalElevation = computeTotalElevationGain(streams.altitude!)

  if (totalDistance === 0 && totalElevation === 0) {
    return {
      총거리: 0,
      총고도: 0,
      평균속도: 0,
      최고속도: 0,
      평균파워: 0,
      최대파워: 0,
      최고심박수: 0,
      평균케이던스: 0,
      powerZoneRatios: { Z1:0,Z2:0,Z3:0,Z4:0,Z5:0,Z6:0,Z7:0 },
      hrZoneRatios: { Z1:0,Z2:0,Z3:0,Z4:0,Z5:0 },
      peakPowers: { '5s':0,'1min':0,'2min':0,'5min':0,'10min':0,'20min':0,'1h':0 },
      hrZoneAverages: { Z1:null,Z2:null,Z3:null,Z4:null,Z5:null },
      ftp60: null,
      riderStyle: { icon:'🚲', name:'데이터 없음', desc:'유효한 주행 데이터가 없습니다.' },
      courseName: null
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
  let ftp60: number | null = null

  if (!streams.watts || streams.watts.every(w => !w)) {
  console.log('⚡ 파워: 추정값으로 대체')


  // ✅ v5.4 파워 추정 (객체 반환)
  const estResult = estimatePower(
    streams.distance!,
    streams.altitude!,
    dt,
    streams.velocity_smooth
  )

  // ✅ 600W 이상이 3초 이상 지속되지 않으면 제외 (Z7 필터)
  estResult.power = sanitizeZ7(estResult.power, dt, 600, 3)

  // ✅ watts 스트림에 파워 배열만 저장
  streams.watts = estResult.power

  // ✅ FTP 추정 (파워 없음 시 대체)
const ftpResult = estimateFtpWithoutPower(
  streams.distance!,
  streams.altitude!,
  dt,
  streams.velocity_smooth,
  totalTime,
  // ⚡ estimatePower.power 만 반환하도록 래핑
  (dist, alt, dtArr, vel) => estimatePower(dist, alt, dtArr, vel).power
)
  ftp60 = ftpResult.ftp60
} else {
  // ⚡ 실제 파워센서 데이터 있는 경우
  ftp60 = computeFtpFromPower(streams.watts, dt, totalTime, 60 * 60, 1.0)
}

  // 스무딩 옵션 적용
  if (SMOOTH_POWER && streams.watts) {
    console.log('⚡ 파워: 스무딩 적용')
    const powerSmooth = rollingMean(streams.watts, 15, true, 1)
    streams.watts = medianFilter(powerSmooth, 9)
  }
  
  // 존 선택 (설정 기반)
  const supabase = await createServiceRoleClient();
  const zonesForPower = await getZoneInfo('power', userId, POWER_ZONES, supabase);
  const zonesForHr = await getZoneInfo('heart', userId, HR_ZONES, supabase);
  
  // 존 비율 계산 (설정 기반)
  if (ZONE_METHOD === 'count') {
    powerZoneRatios = countBasedZoneRatios(streams.watts!, zonesForPower, true)
  } else {
    powerZoneRatios = timeBasedZoneRatios(streams.watts!, dt, zonesForPower, true)
  }
  
  if (!streams.heartrate || streams.heartrate.every(h => !h)) {
    console.log('❤️ 심박: 추정값으로 대체')
    streams.heartrate = estimateHrFromGpsAlt(streams.distance!, streams.altitude!, dt)
  }
  
  if (!streams.cadence || streams.cadence.every(c => !c)) {
    console.log('🔄 케이던스: 추정값으로 대체')
    streams.cadence = estimateCadenceFromFeatures(streams.velocity_smooth!, streams.altitude!, streams.distance!)
  }
  
  // 심박존 비율 계산 (설정 기반)
  let hrZoneRatios: Record<string, number>
  if (ZONE_METHOD === 'count') {
    hrZoneRatios = countBasedZoneRatios(streams.heartrate!, zonesForHr, true)
  } else {
    hrZoneRatios = timeBasedZoneRatios(streams.heartrate!, dt, zonesForHr, true)
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
    { sec: 1200, label: '20min' },
    { sec: 3600, label: '1h' }
  ]
  
  for (const { sec, label } of peakWindows) {
    results.peakPowers[label] = peakPower(streams.watts!, sec, dt, totalTime)
  }
  
  // 심박존 평균 계산
  for (const [zone, [low, high]] of Object.entries(zonesForHr)) {
    const hrInZone = streams.heartrate!.filter(hr => hr >= low && hr <= high)
    results.hrZoneAverages[zone] = hrInZone.length > 0 ? Math.round(hrInZone.reduce((sum, hr) => sum + hr, 0) / hrInZone.length) : null
  }
  
  console.log('🔍 스트림 데이터 분석 완료')
  
  // Python 스크립트와 동일한 출력 형식
  console.log('🚴총거리:', results.총거리, 'km')
  console.log('🚵총고도:', results.총고도, 'm')
  console.log('🪫평균속도:', results.평균속도, 'km/h')
  console.log('🔋최고속도:', results.최고속도, 'km/h')
  console.log('🦵평균파워:', results.평균파워, 'W')
  console.log('🦿최대파워:', results.최대파워, 'W')
  console.log('⚡60min FTP:', results.ftp60 || 'N/A', 'W')
  console.log('❤️최고심박수:', results.최고심박수, 'bpm')
  console.log('💫평균케이던스:', results.평균케이던스, 'rpm\n')
  
  console.log('📈 파워·심박 존 훈련 분석')
  for (const z of Object.keys(zonesForPower)) {
    console.log(`${z}: P ${results.powerZoneRatios[z]}% / H ${results.hrZoneRatios[z]}%`)
  }
  
  console.log('\n⚡ 피크파워 분석')
  const peakPowerStrings = Object.entries(results.peakPowers).map(([label, val]) => 
    `${label}: ${val === null ? 'N/A' : val + 'W'}`
  )
  console.log(peakPowerStrings.join(' / '))
  
  console.log('\n❤️ 심박존 평균 분석 (AI추측)')
  for (const z of Object.keys(zonesForHr)) {
    const val = results.hrZoneAverages[z]
    console.log(`${z}: ${val === null ? 'N/A' : val + ' bpm'}`)
  }
  
   // 코스명 생성
  if (streamsData.latlng?.data) {
    const latlngs = streamsData.latlng.data.map((d: number[]) => ({
      lat: d[0],
      lon: d[1]
    }))
  // 🧭 실내 트레이닝 감지 (GPS 거의 없거나 가상주행)
  if (
    !latlngs ||
    latlngs.length < 5 ||
    results.총거리 < 2 ||
    streamsData.trainer === true ||
    streamsData.type === 'VirtualRide'
  ) {
    results.courseName = '실내 트레이닝'
  } else {
    results.courseName = await generateCourseName(latlngs, results.총거리)
  }
} else {
  // latlng 데이터 자체가 없을 때
  results.courseName = '실내 트레이닝'
}

  console.log('📍코스명 감지 결과:', results.courseName)

  console.log('✅ 스트림 데이터 분석 완료')
  return results
}
