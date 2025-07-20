import { NextResponse } from 'next/server'
import { updateStravaActivityDescription } from '@/lib/utils/description'
import { StravaActivity } from '@/lib/types/strava'
import { STRAVA_VISIBILITY } from '@/lib/constants/strava'

// 테스트 엔드포인트는 인증을 우회합니다
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // URL에서 액세스 토큰과 활동 ID를 가져옵니다
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('token')
    const activityId = searchParams.get('activityId')

    if (!accessToken || !activityId) {
      return NextResponse.json(
        { success: false, error: 'token과 activityId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 테스트용 활동 데이터
    const testActivity: StravaActivity = {
      id: parseInt(activityId),
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

    // 테스트용 디스크립션
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
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('\n❌ 스트라바 업데이트 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
} 