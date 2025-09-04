import { CalculateActivityRankingReturn } from '@/lib/types/ranking'
import { StravaActivity } from '@/lib/types/strava'
import { formatActivityValue } from '@/lib/utils/activity'
import { ACTIVITY_UNITS } from '@/lib/constants/unit'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'

/**
 * 스트랭크 디스크립션 포맷에 맞춰 활동 디스크립션을 생성하는 함수

 * @param activity - 업데이트할 활동 데이터
 * @param rankingsWithDistrict - 업데이트할 활동의 랭킹 데이터
 * @param accessToken - 스트라바 액세스 토큰 (액티비티와 동일한 토큰 사용)
 *
 * @remarks
 * - STRANK.io와 같이 도메인으로 인식되는 텍스트는 스트라바에서 표시되지 않습니다. (STRANK.io 표시 불가 -> STRANK 표시 가능)
 * - 액티비티 데이터를 가져올 때 사용한 동일한 토큰을 스트림 데이터 가져오기에도 사용합니다.
 */
export async function generateActivityDescription(
  activity: StravaActivity,
  rankingsWithDistrict: CalculateActivityRankingReturn | null,
  accessToken: string
): Promise<string> {
  try {
    // 스트림 데이터 가져오기
    console.log('\n📡 스트림 데이터 가져오는 중...')
    let streamsData = null
    
    try {
      // 액티비티 데이터를 가져올 때 사용한 동일한 액세스 토큰으로 스트림 데이터 요청
      console.log('🔑 액티비티와 동일한 액세스 토큰으로 스트림 데이터 요청 중...')
      console.log('📊 액티비티 정보:', {
        id: activity.id,
        name: activity.name,
        visibility: activity.visibility,
        type: activity.type,
        hasHeartrate: activity.has_heartrate,
        hasWatts: activity.device_watts,
      })
      
      const streamsUrl = `${STRAVA_API_URL}/activities/${activity.id}/streams?keys=time,latlng,distance,altitude,velocity_smooth,heartrate,watts,cadence,grade_smooth&key_by_type=true`
      console.log('🌐 스트림 요청 URL:', streamsUrl)
      
      const streamsResponse = await fetch(streamsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (streamsResponse.ok) {
        streamsData = await streamsResponse.json()
        console.log('✅ 스트림 데이터 가져오기 성공 (액티비티와 동일한 토큰 사용)')
        console.log('📈 스트림 데이터 키들:', Object.keys(streamsData))
      } else {
        const errorText = await streamsResponse.text()
        console.log('⚠️ 스트림 데이터 가져오기 실패:', {
          status: streamsResponse.status,
          statusText: streamsResponse.statusText,
          error: errorText,
          activityId: activity.id,
          visibility: activity.visibility,
        })
        
        // 404 오류의 경우 상세한 원인 분석
        if (streamsResponse.status === 404) {
          console.log('🔍 404 오류 원인 분석:')
          console.log('- 액티비티가 공개되지 않았을 수 있습니다 (visibility:', activity.visibility, ')')
          console.log('- 액티비티가 삭제되었을 수 있습니다')
          console.log('- 토큰이 해당 액티비티에 접근할 권한이 없을 수 있습니다')
          console.log('- 스트림 데이터가 존재하지 않을 수 있습니다 (GPS 데이터 없음)')
          
          // 404 오류 시 대안적 접근 방법 시도
          if (activity.visibility === 'everyone') {
            console.log('🔄 공개 액티비티이므로 기본 스트림 키로 재시도...')
            try {
              const fallbackResponse = await fetch(
                `${STRAVA_API_URL}/activities/${activity.id}/streams?keys=time,distance,altitude&key_by_type=true`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              )
              
              if (fallbackResponse.ok) {
                streamsData = await fallbackResponse.json()
                console.log('✅ 기본 스트림 데이터 가져오기 성공 (fallback)')
              } else {
                console.log('⚠️ fallback 스트림 데이터 요청도 실패:', fallbackResponse.status)
              }
            } catch (fallbackError) {
              console.log('⚠️ fallback 스트림 데이터 요청 중 오류:', fallbackError)
            }
          }
        }
      }
    } catch (streamError) {
      console.log('⚠️ 스트림 데이터 가져오기 중 오류:', streamError)
      // 스트림 데이터 가져오기 실패해도 계속 진행
    }

    // ChatGPT API를 통해 디스크립션 생성
    const description = await generateActivityDescriptionWithGPT(
      {
        date: activity.start_date_local,
        distance: (activity.distance || 0) / 1000, // m를 km로 변환
        elevation: activity.total_elevation_gain || 0,
        averageSpeed: (activity.average_speed || 0) * 3.6, // m/s를 km/h로 변환
        maxSpeed: (activity.max_speed || 0) * 3.6, // m/s를 km/h로 변환
        // 값이 0이거나 없는 경우 undefined 처리
        averageWatts: activity.average_watts && activity.average_watts > 0 ? activity.average_watts : undefined,
        maxWatts: activity.max_watts && activity.max_watts > 0 ? activity.max_watts : undefined,
        maxHeartrate: activity.max_heartrate && activity.max_heartrate > 0 ? activity.max_heartrate : undefined,
        averageCadence: activity.average_cadence && activity.average_cadence > 0 ? activity.average_cadence : undefined,
        streamsData: streamsData, // 스트림 데이터 추가
      },
      rankingsWithDistrict && rankingsWithDistrict.rankings
        ? {
            distanceRankCity: rankingsWithDistrict.rankings.distanceRankCity,
            distanceRankDistrict: rankingsWithDistrict.rankings.distanceRankDistrict,
            elevationRankCity: rankingsWithDistrict.rankings.elevationRankCity,
            elevationRankDistrict: rankingsWithDistrict.rankings.elevationRankDistrict,
            district: rankingsWithDistrict.district,
            province: rankingsWithDistrict.province,
          }
        : undefined
    )

    return description
  } catch (error) {
    logError('디스크립션 생성 중 오류 발생:', {
      error,
      functionName: 'generateActivityDescription',
    })

    // 에러 발생 시 기본 디스크립션 생성
    return generateBasicDescription(activity, rankingsWithDistrict)
  }
}

/**
 * 기본 디스크립션 생성 함수 (ChatGPT API 호출 실패 시 사용)
 */
function generateBasicDescription(
  activity: StravaActivity,
  rankingsWithDistrict: CalculateActivityRankingReturn | null
): string {
  const sections = [
    generateDateSection(activity.start_date_local),
    generateRankingSection(rankingsWithDistrict),
    generateAnalysisSection(activity),
  ]

  return sections.join('\n\n\n\n')
}

/**
 * 날짜 섹션 생성 함수
 *
 * @param startDate - 활동 시작 날짜
 * @returns 날짜 섹션
 */
function generateDateSection(startDate: string): string {
  const date = new Date(startDate)
  const formattedDate = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `🚴 STRANK AI 라이딩 리포트 (Pro)\n📅 ${formattedDate}`
}

/**
 * 랭킹 섹션 생성 함수
 *
 * @param rankingsWithDistrict - 랭킹 데이터
 * @returns 랭킹 섹션
 */
export function generateRankingSection(
  rankingsWithDistrict: CalculateActivityRankingReturn | null
): string {
  if (!rankingsWithDistrict || !rankingsWithDistrict.rankings) return ''

  const { rankings, district, province } = rankingsWithDistrict
  const sections = []

  // 거리 랭킹 섹션
  if (rankings.distanceRankCity || rankings.distanceRankDistrict) {
    sections.push(
      `🥇 거리 랭킹${
        rankings.distanceRankCity ? `\n📍${province} (${rankings.distanceRankCity}위)` : ''
      }${rankings.distanceRankDistrict ? `\n📍${district} (${rankings.distanceRankDistrict}위)` : ''}`
    )
  }

  // 고도 랭킹 섹션
  if (rankings.elevationRankCity || rankings.elevationRankDistrict) {
    sections.push(
      `🧗 고도 랭킹${rankings.elevationRankCity ? `\n📍${province} (${rankings.elevationRankCity}위)` : ''}${
        rankings.elevationRankDistrict
          ? `\n📍${district} (${rankings.elevationRankDistrict}위)`
          : ''
      }`
    )
  }

  return sections.join('\n\n')
}

/**
 * 분석 섹션 생성 함수
 *
 * @param activity - 분석할 활동 데이터
 * @returns 분석 섹션
 */
function generateAnalysisSection(activity: StravaActivity): string {
  const {
    distance = 0,
    total_elevation_gain = 0,
    average_speed = 0,
    max_speed = 0,
    average_watts = 0,
    max_watts = 0,
    max_heartrate = 0,
    average_cadence = 0,
  } = activity

  const metrics = [
    ['🚴총거리', formatActivityValue(distance, 'distance'), ACTIVITY_UNITS.DISTANCE],
    ['🚵 총고도', formatActivityValue(total_elevation_gain), ACTIVITY_UNITS.ELEVATION],
    ['🪫평균속도', formatActivityValue(average_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ['🔋최고속도', formatActivityValue(max_speed, 'speed'), ACTIVITY_UNITS.SPEED],
    ...(average_watts! >= 1
      ? [['🦵평균파워', formatActivityValue(average_watts), ACTIVITY_UNITS.POWER]]
      : []),
    ...(max_watts! >= 1
      ? [['🦿최대파워', formatActivityValue(max_watts), ACTIVITY_UNITS.POWER]]
      : []),
    ...(max_heartrate! >= 1
      ? [['❤️최고심박수', formatActivityValue(max_heartrate), ACTIVITY_UNITS.HEART_RATE]]
      : []),
    ...(average_cadence! >= 1
      ? [['💫평균케이던스', formatActivityValue(average_cadence), ACTIVITY_UNITS.CADENCE]]
      : []),
  ]

  const analysisInfo = metrics
    .map(([label, value, unit]) => `${label} : ${value} ${unit}`)
    .join('\n')

  return `◾ 라이딩 분석 정보 ◾
${analysisInfo}

🏆 Powered by STRANK`
}

/**
 * 스트라바 활동의 설명을 업데이트하는 함수
 *
 * @description
 * 기존 설명이 있다면 유지하고 아래에 새로운 설명을 추가합니다
 *
 * @param accessToken - 스트라바 액세스 토큰
 * @param stravaActivity - 업데이트할 활동 정보
 * @param strankDescription - 스트랭크의 디스크립션
 *
 * @throws {Error} API_LIMIT_EXCEEDED - API 호출 한도 초과 시
 * @throws {Error} ACTIVITY_UPDATE_FAILED - 활동 업데이트 실패 시
 *
 * @remarks
 * - Rate limit 초과 시 별도의 에러를 발생시킵니다
 */
export async function updateStravaActivityDescription(
  accessToken: string,
  stravaActivity: StravaActivity,
  strankDescription: string
): Promise<void> {
  // * Strank 디스크립션을 최상단에 배치, 나머지 디스크립션을 하위에 추가
  const combinedDescription = stravaActivity.description
    ? `${strankDescription}\n\n${stravaActivity.description}`
    : strankDescription

  const updateResponse = await fetch(
    `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(stravaActivity.id)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: combinedDescription,
      }),
    }
  )

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()

    if (updateResponse.status === 429) {
      logError('Strava API: Rate limit exceeded when updating activity description', {
        functionName: 'updateStravaActivityDescription',
      })
      throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
    }

    logError('Strava API: Failed to update activity description:', {
      error: errorText,
      functionName: 'updateStravaActivityDescription',
    })
    throw new Error(ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED)
  }
}
