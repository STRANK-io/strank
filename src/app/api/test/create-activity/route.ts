import { NextResponse } from 'next/server'
import { processCreateActivityEvent } from '@/lib/utils/webhook'
import { StravaActivity, StravaWebhookEventResponse } from '@/lib/types/strava'
import { STRAVA_VISIBILITY } from '@/lib/constants/strava'
import { generateActivityDescription } from '@/lib/utils/description'

// 테스트 엔드포인트는 인증을 우회합니다
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // 테스트용 활동 데이터
    const testActivity: StravaActivity = {
      id: 15171788816,
      name: 'TEST Riding',
      description: '',
      distance: 42463.0,
      moving_time: 5878,
      elapsed_time: 10287,
      total_elevation_gain: 55.0,
      type: 'Ride',
      sport_type: 'Ride',
      workout_type: 10,
      start_date: '2025-07-15T10:49:58Z',
      start_date_local: '2025-07-15T19:49:58Z',
      timezone: '(GMT+09:00) Asia/Seoul',
      utc_offset: 32400.0,
      location_city: null,
      location_state: null,
      location_country: null,
      achievement_count: 14,
      kudos_count: 0,
      comment_count: 0,
      athlete_count: 1,
      photo_count: 0,
      trainer: false,
      commute: false,
      manual: false,
      private: false,
      visibility: STRAVA_VISIBILITY.EVERYONE,
      flagged: false,
      gear_id: 'b12941370',
      start_latlng: [],
      end_latlng: [],
      average_speed: 7.224,
      max_speed: 12.84,
      average_cadence: 67.1,
      average_temp: 22,
      average_watts: 114.1,
      max_watts: 522,
      weighted_average_watts: 143,
      kilojoules: 630.3,
      device_watts: true,
      has_heartrate: true,
      average_heartrate: 155.2,
      max_heartrate: 191.0,
      heartrate_opt_out: false,
      display_hide_heartrate_option: true,
      elev_high: 13.6,
      elev_low: -10.0,
      upload_id: 16201404577,
      upload_id_str: '16201404577',
      external_id: '4050230a-8222-48c1-ad03-009c3fb33839.fit',
      from_accepted_tag: false,
      pr_count: 2,
      total_photo_count: 0,
      has_kudoed: false,
    }

    console.log('🚀 활동 생성 테스트 시작...')
    console.log('\n📊 활동 데이터:', {
      id: testActivity.id,
      name: testActivity.name,
      distance: testActivity.distance,
      elevation: testActivity.total_elevation_gain,
    })

    // 테스트용 랭킹 데이터
    const rankingData = {
      rankings: {
        distanceRankCity: 84,
        distanceRankDistrict: 9,
        elevationRankCity: 89,
        elevationRankDistrict: 9,
      },
      district: '구로구',
      province: '서울시',
    }

    // 디스크립션 생성 (테스트용 더미 토큰 사용)
    const description = await generateActivityDescription(testActivity, rankingData, 'test-token')

    console.log('\n📝 생성된 디스크립션:', description)

    console.log('\n✅ 활동 생성 완료')
    return NextResponse.json({ success: true, description })
  } catch (error) {
    console.error('\n❌ 활동 생성 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
} 