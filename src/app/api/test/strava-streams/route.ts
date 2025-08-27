import { NextResponse } from 'next/server'
import { fetchStravaActivityStreams } from '@/lib/utils/strava'
import { logError } from '@/lib/utils/log'

// 테스트 엔드포인트는 인증을 우회합니다
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // URL에서 액세스 토큰, 활동 ID, 스트림 키들을 가져옵니다
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('token')
    const activityId = searchParams.get('activityId')
    const keys = searchParams.get('keys')?.split(',') || ['distance', 'time', 'latlng', 'altitude', 'velocity_smooth', 'heartrate', 'cadence', 'watts', 'grade_smooth']

    if (!accessToken || !activityId) {
      return NextResponse.json(
        { success: false, error: 'token과 activityId가 필요합니다.' },
        { status: 400 }
      )
    }

    const numericActivityId = parseInt(activityId, 10)
    if (isNaN(numericActivityId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 activityId입니다.' },
        { status: 400 }
      )
    }

    console.log('🚀 스트라바 스트림 API 테스트 시작...')
    console.log('\n📊 요청 정보:', {
      activityId: numericActivityId,
      requestedKeys: keys,
      hasToken: !!accessToken,
    })

    // 스트라바 스트림 데이터 요청
    const streamsData = await fetchStravaActivityStreams(
      numericActivityId,
      accessToken,
      keys
    )

    console.log('\n📈 스트림 데이터 요약:', {
      availableKeys: Object.keys(streamsData),
      totalDataPoints: Object.values(streamsData).reduce((total, stream) => {
        return total + (stream?.data?.length || 0)
      }, 0),
    })

    // 각 스트림 데이터의 상세 정보 출력
    Object.entries(streamsData).forEach(([key, streamData]) => {
      if (streamData) {
        console.log(`\n🔍 ${key}:`, {
          dataPoints: streamData.data.length,
          resolution: streamData.resolution,
          seriesType: streamData.series_type,
          sampleData: streamData.data.slice(0, 5), // 처음 5개 데이터 샘플
        })
      }
    })

    console.log('\n✅ 스트림 데이터 가져오기 완료')
    
    return NextResponse.json({
      success: true,
      data: streamsData,
      summary: {
        activityId: numericActivityId,
        requestedKeys: keys,
        availableKeys: Object.keys(streamsData),
        totalDataPoints: Object.values(streamsData).reduce((total, stream) => {
          return total + (stream?.data?.length || 0)
        }, 0),
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('\n❌ 스트림 데이터 가져오기 중 오류 발생:', error)
    
    // 오류 로깅
    logError('Error in strava-streams test endpoint:', {
      error,
      functionName: 'GET /api/test/strava-streams',
    })
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}
