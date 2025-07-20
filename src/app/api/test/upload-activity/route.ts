import { NextResponse } from 'next/server'
import { STRAVA_API_URL } from '@/lib/constants/strava'

// 테스트 엔드포인트는 인증을 우회합니다
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('accessToken')

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'accessToken이 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('🚀 활동 업로드 테스트 시작...')

    // 테스트용 활동 데이터
    const testActivity = {
      name: 'STRANK 테스트 라이딩',
      type: 'Ride',
      sport_type: 'Ride',
      start_date_local: new Date().toISOString(),
      elapsed_time: 3600, // 1시간
      description: '',
      distance: 30000, // 30km
      trainer: 0,
      commute: 0,
      hide_from_home: false,
      visibility: 'everyone',
    }

    console.log('\n📊 업로드할 활동 데이터:', testActivity)

    // 스트라바 API를 통해 활동 생성
    const response = await fetch(`${STRAVA_API_URL}/activities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testActivity),
    })

    if (!response.ok) {
      throw new Error('Failed to create activity: ' + await response.text())
    }

    const createdActivity = await response.json()

    console.log('\n✅ 활동 업로드 완료:', {
      id: createdActivity.id,
      name: createdActivity.name,
    })

    return NextResponse.json({ 
      success: true, 
      activity: {
        id: createdActivity.id,
        name: createdActivity.name,
      }
    })
  } catch (error) {
    console.error('\n❌ 활동 업로드 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
} 