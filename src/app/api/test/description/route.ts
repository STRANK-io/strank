import { NextResponse } from 'next/server'
import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'

/**
 * ChatGPT API를 테스트하기 위한 엔드포인트
 * 
 * @description
 * 실제 활동 데이터와 유사한 테스트 데이터를 사용하여 디스크립션을 생성합니다.
 * 생성된 디스크립션은 보기 좋게 포맷팅되어 반환됩니다.
 */
export async function GET() {
  try {
    // 테스트용 활동 데이터
    const testActivityData = {
      date: new Date().toISOString(),
      distance: 30.5,
      elevation: 450,
      averageSpeed: 25.3,
      maxSpeed: 45.2,
      averageWatts: 180,
      maxWatts: 450,
      maxHeartrate: 175,
      averageCadence: 85,
    }

    // 테스트용 랭킹 데이터
    const testRankingData = {
      distanceRankCity: 84,
      distanceRankDistrict: 9,
      elevationRankCity: 89,
      elevationRankDistrict: 9,
      district: '구로구',
    }

    console.log('\n🚀 디스크립션 생성 테스트 시작...')
    console.log('\n📊 테스트 데이터:', {
      activity: testActivityData,
      ranking: testRankingData,
    })

    // 디스크립션 생성
    const description = await generateActivityDescriptionWithGPT(testActivityData, testRankingData)

    // 디스크립션을 섹션별로 분리하여 포맷팅
    const sections = description.split('\n\n')
    const formattedDescription = sections.map(section => section.trim()).join('\n\n')

    console.log('\n✅ 생성된 디스크립션:')
    console.log(formattedDescription)

    return NextResponse.json({ 
      success: true, 
      data: {
        description: formattedDescription,
        sections: sections.map(section => section.trim())
      }
    })
  } catch (error) {
    console.error('\n❌ 디스크립션 생성 중 오류 발생:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
