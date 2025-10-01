import { NextResponse } from 'next/server'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { StravaActivity } from '@/lib/types/strava'
import { ERROR_CODES } from '@/lib/constants/error'

export const maxDuration = 300

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const activityId = searchParams.get('activityId')
    const userId = searchParams.get('userId')

    if (!token || !activityId || !userId) {
      return NextResponse.json(
        { success: false, error: 'token, activityId, userId가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('\n🚀 디스크립션 생성 테스트 시작...')

    // 실제 활동 데이터 가져오기
    const response = await fetch(
      `${STRAVA_API_URL}${STRAVA_ACTIVITY_BY_ID_ENDPOINT(parseInt(activityId))}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(ERROR_CODES.STRAVA.API_LIMIT_EXCEEDED)
      }
      throw new Error('Failed to fetch activity: ' + await response.text())
    }

    const activity: StravaActivity = await response.json()

    // 스트림 데이터 가져오기
    console.log('\n📡 스트림 데이터 가져오는 중...')
    const streamsResponse = await fetch(
      `${STRAVA_API_URL}/activities/${activityId}/streams?keys=time,latlng,distance,altitude,velocity_smooth,heartrate,watts,cadence,grade_smooth&key_by_type=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    let streamsData = null
    if (streamsResponse.ok) {
      streamsData = await streamsResponse.json()
      console.log('✅ 스트림 데이터 가져오기 성공')
    } else {
      console.log('⚠️ 스트림 데이터 가져오기 실패:', streamsResponse.status)
    }

    console.log('\n📊 활동 데이터:', {
      id: activity.id,
      name: activity.name,
      distance: activity.distance,
      elevation: activity.total_elevation_gain,
    })

    // 1. 스트림 데이터 없이 디스크립션 생성 (기존 방식)
    console.log('\n🔍 1단계: 스트림 데이터 없이 디스크립션 생성...')
    const descriptionWithoutStreams = await generateActivityDescriptionWithGPT(
      userId,
      {
        date: activity.start_date_local,
        distance: (activity.distance || 0) / 1000, // m를 km로 변환
        elevation: activity.total_elevation_gain || 0,
        averageSpeed: (activity.average_speed || 0) * 3.6, // m/s를 km/h로 변환
        maxSpeed: (activity.max_speed || 0) * 3.6, // m/s를 km/h로 변환
        averageWatts: activity.average_watts || undefined,
        maxWatts: activity.max_watts || undefined,
        maxHeartrate: activity.max_heartrate || undefined,
        averageCadence: activity.average_cadence || undefined,
        // streamsData: undefined (스트림 데이터 없음)
      },
      {
        distanceRankCity: 84,
        distanceRankDistrict: 9,
        elevationRankCity: 89,
        elevationRankDistrict: 9,
        district: '신사동',
        province: '서울시',
      }
    )

    // 2. 스트림 데이터와 함께 디스크립션 생성 (새로운 방식)
    console.log('\n🔍 2단계: 스트림 데이터와 함께 디스크립션 생성...')
    const descriptionWithStreams = await generateActivityDescriptionWithGPT(
      userId,
      {
        date: activity.start_date_local,
        distance: (activity.distance || 0) / 1000, // m를 km로 변환
        elevation: activity.total_elevation_gain || 0,
        averageSpeed: (activity.average_speed || 0) * 3.6, // m/s를 km/h로 변환
        maxSpeed: (activity.max_speed || 0) * 3.6, // m/s를 km/h로 변환
        averageWatts: activity.average_watts || undefined,
        maxWatts: activity.max_watts || undefined,
        maxHeartrate: activity.max_heartrate || undefined,
        averageCadence: activity.average_cadence || undefined,
        streamsData: streamsData, // 스트림 데이터 포함
      },
      {
        distanceRankCity: 84,
        distanceRankDistrict: 9,
        elevationRankCity: 89,
        elevationRankDistrict: 9,
        district: '신사동',
        province: '서울시',
      }
    )

    // 결과 비교 분석
    console.log('\n' + '='.repeat(80))
    console.log('📊 GPT 응답 비교 분석')
    console.log('='.repeat(80))

    // 1. 스트림 데이터 없는 경우
    const sectionsWithoutStreams = descriptionWithoutStreams.split('\n\n')
    const formattedDescriptionWithoutStreams = sectionsWithoutStreams.map(section => section.trim()).join('\n\n')

    console.log('\n🔴 스트림 데이터 없이 생성된 디스크립션:')
    console.log(formattedDescriptionWithoutStreams)

    // 2. 스트림 데이터 있는 경우
    const sectionsWithStreams = descriptionWithStreams.split('\n\n')
    const formattedDescriptionWithStreams = sectionsWithStreams.map(section => section.trim()).join('\n\n')

    console.log('\n🟢 스트림 데이터와 함께 생성된 디스크립션:')
    console.log(formattedDescriptionWithStreams)

    // 3. 차이점 분석
    console.log('\n' + '='.repeat(80))
    console.log('📈 응답 차이점 분석')
    console.log('='.repeat(80))
    console.log(`🔴 스트림 데이터 없음: ${descriptionWithoutStreams.length}자`)
    console.log(`🟢 스트림 데이터 있음: ${descriptionWithStreams.length}자`)
    console.log(`📊 차이: ${Math.abs(descriptionWithStreams.length - descriptionWithoutStreams.length)}자`)
    
    // 주요 섹션별 비교
    const compareSections = (without: string, withStreams: string, sectionName: string) => {
      const withoutSection = without.includes(sectionName) ? without.split(sectionName)[1]?.split('\n\n')[0] || '' : ''
      const withStreamsSection = withStreams.includes(sectionName) ? withStreams.split(sectionName)[1]?.split('\n\n')[0] || '' : ''
      
      if (withoutSection !== withStreamsSection) {
        console.log(`\n📝 ${sectionName} 섹션 비교:`)
        console.log(`🔴 없음: ${withoutSection.substring(0, 100)}...`)
        console.log(`🟢 있음: ${withStreamsSection.substring(0, 100)}...`)
      }
    }

    compareSections(descriptionWithoutStreams, descriptionWithStreams, '📝 간단한분석')
    compareSections(descriptionWithoutStreams, descriptionWithStreams, '📊 훈련 분석')
    compareSections(descriptionWithoutStreams, descriptionWithStreams, '📈 파워·심박 존 훈련 분석')

    console.log('\n' + '='.repeat(80))
    console.log('✅ 비교 분석 완료')
    console.log('='.repeat(80))

    return NextResponse.json({
      success: true,
      data: {
        comparison: {
          withoutStreams: {
            description: formattedDescriptionWithoutStreams,
            sections: sectionsWithoutStreams.map(section => section.trim()),
            length: descriptionWithoutStreams.length
          },
          withStreams: {
            description: formattedDescriptionWithStreams,
            sections: sectionsWithStreams.map(section => section.trim()),
            length: descriptionWithStreams.length
          },
          difference: Math.abs(descriptionWithStreams.length - descriptionWithoutStreams.length)
        }
      }
    })
  } catch (error) {
    console.error('\n❌ 디스크립션 생성 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
