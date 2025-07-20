import { generateActivityDescriptionWithGPT } from '@/lib/utils/openai'

describe('Description Generation Test', () => {
  it('should generate description with ChatGPT', async () => {
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
      distanceRankCity: 5,
      distanceRankDistrict: 2,
      elevationRankCity: 8,
      elevationRankDistrict: 3,
      district: '강남구',
    }

    console.log('🚀 디스크립션 생성 테스트 시작...')
    console.log('\n📊 테스트 데이터:', {
      activity: testActivityData,
      ranking: testRankingData,
    })

    // 디스크립션 생성
    const description = await generateActivityDescriptionWithGPT(testActivityData, testRankingData)

    console.log('\n✅ 생성된 디스크립션:')
    console.log(description)

    expect(description).toBeTruthy()
    expect(typeof description).toBe('string')
    expect(description.length).toBeGreaterThan(0)
  })
})
