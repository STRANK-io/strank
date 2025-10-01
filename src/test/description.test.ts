import { generateActivityDescriptionWithGPT } from '../lib/utils/openai'

async function testDescriptionGeneration() {
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
      streamsData: {
        // 테스트용 스트림 데이터
        time: {
          data: [0, 1, 2, 3, 4, 5],
          resolution: 'high',
          series_type: 'time'
        },
        distance: {
          data: [0, 100, 200, 300, 400, 500],
          resolution: 'high',
          series_type: 'distance'
        },
        altitude: {
          data: [100, 105, 110, 108, 112, 115],
          resolution: 'high',
          series_type: 'altitude'
        }
      }
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


    if (!process.env.TEST_USER_ID) {
      throw new Error('TEST_USER_ID가 설정되지 않았습니다.')
    }

    const userId = process.env.TEST_USER_ID;

    // 디스크립션 생성
    const description = await generateActivityDescriptionWithGPT(userId, testActivityData, testRankingData)

    console.log('\n✅ 생성된 디스크립션:')
    console.log(description)

    return description
  } catch (error) {
    console.error('\n❌ 디스크립션 생성 중 오류 발생:', error)
    throw error
  }
}

// 테스트 실행
testDescriptionGeneration()
