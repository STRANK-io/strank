import { NextResponse } from 'next/server'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'
import { STRAVA_ACTIVITY_BY_ID_ENDPOINT, STRAVA_API_URL } from '@/lib/constants/strava'
import { StravaActivity } from '@/lib/types/strava'
import { ERROR_CODES } from '@/lib/constants/error'
import { generateActivityDescription } from '@/lib/utils/description'

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

    const description = await generateActivityDescription(
      activity,
      userId,
      {
        rankings: {
          distanceRankCity: 84,
          distanceRankDistrict: 9,
          elevationRankCity: 89,
          elevationRankDistrict: 9,
        },
        district: '신사동',
        province: '서울시',
      },
      token
    )

    return NextResponse.json({
      success: true,
      data: {
        description: description
      }
    })
  } catch (error) {
    console.error('\n❌ 디스크립션 생성 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
