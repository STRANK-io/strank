import { updateStravaActivityDescription } from '@/lib/utils/description'
import { StravaActivity } from '@/lib/types/strava'
import { STRAVA_VISIBILITY } from '@/lib/constants/strava'

async function testStravaUpdate() {
  try {
    // 테스트용 액세스 토큰 (실제 토큰으로 교체 필요)
    const accessToken = 'your_access_token'

    // 테스트용 활동 ID (실제 활동 ID로 교체 필요)
    const activityId = 123456789

    // 테스트용 활동 데이터
    const testActivity: StravaActivity = {
      id: activityId,
      name: '테스트 라이딩',
      description: '',
      distance: 0,
      moving_time: 0,
      elapsed_time: 0,
      total_elevation_gain: 0,
      type: '',
      start_date: '',
      start_date_local: '',
      timezone: '',
      visibility: STRAVA_VISIBILITY.EVERYONE,
      average_speed: 0,
      max_speed: 0,
      average_watts: 0,
      max_watts: 0,
      average_cadence: 0,
      max_heartrate: 0,
    }

    // 1단계 테스트에서 생성된 디스크립션
    const testDescription = `🚴 STRANK AI 라이딩 리포트 (Pro)
테스트용 디스크립션입니다.
이 부분은 실제 생성된 디스크립션으로 교체해주세요.`

    console.log('🚀 스트라바 업데이트 테스트 시작...')
    console.log('\n📊 테스트 데이터:', {
      activityId,
      description: testDescription.substring(0, 100) + '...',
    })

    // 스트라바 업데이트
    await updateStravaActivityDescription(accessToken, testActivity, testDescription)

    console.log('\n✅ 스트라바 업데이트 완료')
  } catch (error) {
    console.error('\n❌ 스트라바 업데이트 중 오류 발생:', error)
    throw error
  }
}

// 테스트 실행
testStravaUpdate()
