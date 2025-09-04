import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchStravaActivityStreams } from '@/lib/utils/strava'
import { logError } from '@/lib/utils/log'

export const maxDuration = 300

/**
 * 스트라바 액티비티의 스트림 데이터를 가져오는 API 엔드포인트
 * 
 * @param request - Next.js 요청 객체
 * @returns {Promise<NextResponse>} 스트림 데이터 응답
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[스트림 API] 스트림 데이터 요청 시작')
    
    // URL 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('activityId')
    const keys = searchParams.get('keys')?.split(',') || ['distance', 'time', 'latlng', 'altitude', 'velocity_smooth', 'heartrate', 'cadence', 'watts', 'grade_smooth']
    
    // 필수 파라미터 검증
    if (!activityId) {
      console.error('[스트림 API] activityId 파라미터가 누락되었습니다.')
      return NextResponse.json(
        { error: 'activityId 파라미터가 필요합니다.' },
        { status: 400 }
      )
    }
    
    const numericActivityId = parseInt(activityId, 10)
    if (isNaN(numericActivityId)) {
      console.error('[스트림 API] 유효하지 않은 activityId입니다:', activityId)
      return NextResponse.json(
        { error: '유효하지 않은 activityId입니다.' },
        { status: 400 }
      )
    }
    
    console.log(`[스트림 API] 액티비티 ID: ${numericActivityId}, 요청 키: ${keys.join(',')}`)
    
    // Supabase 클라이언트 생성
    const supabase = await createClient()
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[스트림 API] 사용자 인증 실패:', authError)
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    console.log(`[스트림 API] 사용자 인증 성공: ${user.id}`)
    
    // 사용자의 스트라바 액세스 토큰 조회
    const { data: stravaToken, error: tokenError } = await supabase
      .from('strava_user_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()
    
    if (tokenError || !stravaToken?.access_token) {
      console.error('[스트림 API] 스트라바 액세스 토큰을 찾을 수 없습니다:', tokenError)
      return NextResponse.json(
        { error: '스트라바 연동이 필요합니다.' },
        { status: 400 }
      )
    }
    
    console.log(`[스트림 API] 스트라바 액세스 토큰 조회 성공`)
    
    // 스트라바 스트림 데이터 요청
    const streamsData = await fetchStravaActivityStreams(
      numericActivityId,
      stravaToken.access_token,
      keys
    )
    
    console.log(`[스트림 API] 액티비티 ${numericActivityId}의 스트림 데이터 성공적으로 가져옴`)
    
    // 응답 반환
    return NextResponse.json({
      success: true,
      data: streamsData,
      activityId: numericActivityId,
      requestedKeys: keys,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[스트림 API] 오류 발생:', error)
    
    // 오류 로깅
    logError('Error in streams API endpoint:', {
      error,
      functionName: 'GET /api/strava/streams',
    })
    
    // 클라이언트에 오류 응답
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return NextResponse.json(
      { 
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
