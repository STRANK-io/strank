import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { generateRankingSection } from '@/lib/utils/description'
import { analyzeStreamData } from '@/lib/utils/streamAnalyzer'

// API 키 확인
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.')
}

// 활동 데이터 스키마 정의
const activityDataSchema = z.object({
  date: z.string(),
  distance: z.number(),
  elevation: z.number(),
  averageSpeed: z.number(),
  maxSpeed: z.number(),
  averageWatts: z.number().optional(),
  maxWatts: z.number().optional(),
  maxHeartrate: z.number().optional(),
  averageCadence: z.number().optional(),
  streamsData: z.any().optional(), // 스트림 데이터 전체 포함
})

// 랭킹 데이터 스키마 정의
const rankingDataSchema = z.object({
  distanceRankCity: z.number().nullable(),
  distanceRankDistrict: z.number().nullable(),
  elevationRankCity: z.number().nullable(),
  elevationRankDistrict: z.number().nullable(),
  district: z.string(),
  province: z.string(),
})

export async function generateActivityDescriptionWithGPT(
  activityData: z.infer<typeof activityDataSchema>,
  rankingData?: z.infer<typeof rankingDataSchema>
): Promise<string> {
  
  // 요청 메시지 배열 선언 (전역)
  const messages: Array<{ role: 'system' | 'user'; content: string }> = []
  
  // 스트림 데이터 분석
  let streamAnalysis = null
  if (activityData.streamsData) {
    try {
      console.log('\n📊 스트림 데이터 분석 시작...')
      streamAnalysis = analyzeStreamData(activityData.streamsData)
      console.log('✅ 스트림 데이터 분석 완료\n')
    } catch (error) {
      console.log('❌ 스트림 데이터 분석 실패:', error)
      console.log('📝 원본 데이터로 진행합니다\n')
    }
  }

  try {
    // API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      logError('OpenAI API 키가 설정되지 않음', {
        functionName: 'generateActivityDescriptionWithGPT',
      })
      throw new Error(ERROR_CODES.OPENAI.API_ERROR)
    }

    // 랭킹 데이터 로깅
    console.log('📊 랭킹 데이터:', {
      rankingData,
      time: new Date().toISOString()
    })

    // 랭킹 섹션 미리 생성
    const rankingSection = rankingData ? generateRankingSection({ rankings: rankingData, district: rankingData.district || '', province: rankingData.province || '지역 없음' }) : ''
    
    // 생성된 랭킹 섹션 로깅
    console.log('📝 생성된 랭킹 섹션:', {
      rankingSection,
      time: new Date().toISOString()
    })

    // 템플릿 준비
    console.log('🔍 템플릿 생성 전 스트림 데이터 확인:', {
      hasStreamsData: !!activityData.streamsData,
      streamsDataType: typeof activityData.streamsData,
      streamsDataKeys: activityData.streamsData ? Object.keys(activityData.streamsData) : 'undefined',
      time: new Date().toISOString()
    })
    
    const template = `
🚴 STRANK AI 라이딩 리포트
📅 [년-월-일-요일]

${rankingSection}

◾ 라이딩 분석 정보 ◾
🚴총거리: [총거리] km
🚵총고도: [총고도] m
🪫평균속도: [평균속도] km/h
🔋최고속도: [최고속도] km/h
🦵평균파워: [평균파워] W
🦿최대파워: [최대파워] W
❤️최고심박수: [최고심박수] bpm
💫평균케이던스: [평균케이던스] rpm

📝 간단한분석
[작성가이드에 맞춰 작성]

🧠 AI 라이딩 코칭
📊 훈련 분석
[작성가이드에 맞춰 작성]

🛌 회복 가이드
[작성가이드에 맞춰 작성]

💪 다음 훈련 추천
[작성가이드에 맞춰 작성]

🎯 중장기 목표
[작성가이드에 맞춰 작성]

📈 파워·심박 존 훈련 분석 (AI분석)
⚪ Z1 회복       : P [Z1_P]% / H [Z1_H]%
🔵 Z2 지구력    : P [Z2_P]% / H [Z2_H]%
🟢 Z3 템포       : P [Z3_P]% / H [Z3_H]%
🟠 Z4 임계       : P [Z4_P]% / H [Z4_H]%
🔴 Z5 최대산소 : P [Z5_P]% / H [Z5_H]%
🟣 Z6 무산소    : P [Z6_P]%
⚡ Z7 스프린트 : P [Z7_P]%
📌 Zone ?~? 중심의 유산소 능력 발달 훈련

⚡ 피크파워 분석 (AI분석)
5초: [P_5s]W / 1분: [P_1min]W / 2분: [P_2min]W
5분: [P_5min]W / 10분: [P_10min]W / 30분: [P_30min]W / 1시간: [P_1h]W

❤️ 심박존 평균 분석 (AI분석)
Z1: [H_Z1]bpm / Z2: [H_Z2]bpm / Z3: [H_Z3]bpm
Z4: [H_Z4]bpm / Z5: [H_Z5]bpm

🧘‍♂️ 회복 스트레칭
[작성가이드에 맞춰 작성]

🥗 회복 식단
[작성가이드에 맞춰 작성]

🧩 오늘의 훈련 요약
[작성가이드에 맞춰 작성]

🏆 Powered by STRANK`

    // AI SDK를 사용한 텍스트 생성
    console.log('🤖 GPT API 호출 시작:', {
      model: 'gpt-5-mini-2025-08-07',
      template: template.substring(0, 500) + '...', // 템플릿의 앞부분만 로깅
      time: new Date().toISOString()
    })

    // 메시지 배열에 데이터 추가
    messages.push({
      role: 'system',
      content: '당신은 사이클링 전문 코치이자 퍼포먼스 데이터 분석 전문가입니다. 사용자의 활동 데이터를 기반으로 정밀한 피트니스 인사이트를 제공하고, 준프로급 라이더를 목표로 효율적인 훈련 전략과 개선 방향을 제시합니다. 모든 분석은 실전 주행 데이터를 바탕으로 과학적이며 실용적으로 조금은 위트있고 분석내용은 일반인도 이해하기 쉽게 전달되어야 합니다.'
    })
    
    messages.push({
          role: 'user',
          content: `
이 템플릿은 스트라바의 디스크립션에 작성되는 내용이야.
주어진 템플릿의 형식을 정확히 유지하면서, [ ] 안의 내용을 분석데이터로 채워줘.
아래는 채워야 할 템플릿이야.

*템플릿 시작*
${template}
*템플릿 끝*

※템플릿에 사용 될 데이터
활동 데이터:
- 날짜: ${activityData.date}
- 총거리: ${activityData.distance}km
- 총고도: ${activityData.elevation}m
- 평균속도: ${activityData.averageSpeed}km/h
- 최고속도: ${activityData.maxSpeed}km/h
${activityData.averageWatts ? `- 평균파워: ${activityData.averageWatts}W\n` : ''}
${activityData.maxWatts ? `- 최대파워: ${activityData.maxWatts}W\n` : ''}
${activityData.maxHeartrate ? `- 최고심박수: ${activityData.maxHeartrate}bpm\n` : ''}
${activityData.averageCadence ? `- 평균케이던스: ${activityData.averageCadence}rpm\n` : ''}

※스트림 데이터 분석 결과
${streamAnalysis ? `
스트림 데이터를 분석한 결과입니다:
- 총거리: ${streamAnalysis.총거리}km
- 총고도: ${streamAnalysis.총고도}m  
- 평균속도: ${streamAnalysis.평균속도}km/h
- 최고속도: ${streamAnalysis.최고속도}km/h
- 평균파워: ${streamAnalysis.평균파워}W
- 최대파워: ${streamAnalysis.최대파워}W
- 최고심박수: ${streamAnalysis.최고심박수}bpm
- 평균케이던스: ${streamAnalysis.평균케이던스}rpm

FTP 분석:
- 20분 FTP: ${streamAnalysis.ftp20 || 'N/A'}W
- 60분 FTP: ${streamAnalysis.ftp60 || 'N/A'}W

파워존 분포:
- Z1: ${streamAnalysis.powerZoneRatios.Z1}% / Z2: ${streamAnalysis.powerZoneRatios.Z2}% / Z3: ${streamAnalysis.powerZoneRatios.Z3}% / Z4: ${streamAnalysis.powerZoneRatios.Z4}% / Z5: ${streamAnalysis.powerZoneRatios.Z5}% / Z6: ${streamAnalysis.powerZoneRatios.Z6 || 0}% / Z7: ${streamAnalysis.powerZoneRatios.Z7 || 0}%

심박존 분포:
- Z1: ${streamAnalysis.hrZoneRatios.Z1}% / Z2: ${streamAnalysis.hrZoneRatios.Z2}% / Z3: ${streamAnalysis.hrZoneRatios.Z3}% / Z4: ${streamAnalysis.hrZoneRatios.Z4}% / Z5: ${streamAnalysis.hrZoneRatios.Z5}%

피크파워 분석:
- 5초: ${streamAnalysis.peakPowers['5s']}W / 1분: ${streamAnalysis.peakPowers['1min']}W / 2분: ${streamAnalysis.peakPowers['2min']}W
- 5분: ${streamAnalysis.peakPowers['5min']}W / 10분: ${streamAnalysis.peakPowers['10min']}W / 30분: ${streamAnalysis.peakPowers['30min']}W / 1시간: ${streamAnalysis.peakPowers['1h']}W

심박존 평균:
- Z1: ${streamAnalysis.hrZoneAverages.Z1}bpm / Z2: ${streamAnalysis.hrZoneAverages.Z2}bpm / Z3: ${streamAnalysis.hrZoneAverages.Z3}bpm
- Z4: ${streamAnalysis.hrZoneAverages.Z4}bpm / Z5: ${streamAnalysis.hrZoneAverages.Z5}bpm
` : ''}

※전체 주의사항
템플릿의 모든 이모지와 포맷, 그리고 데이터 표기를 정수로 유지해줘.
[]안의 내용만 교체하고, 나머지 구조는 그대로 유지해줘.
자전거 라이더에게 의미있는 인사이트를 제공해줘.
모든 내용에 단위를 제외하고는 반드시 한국어만 사용해줘.

※작성가이드
■ 간단한분석
라이딩스타일은 아래 참고내용을 참고해서 표시해줘
스트림 데이터 분석 결과를 바탕으로 이번 주행의 페이스 조절, 리듬등 관점에서 예시와 같이 요약해줘.
[참고내용]
🚲 초보형 (입문형 라이더)
🔥 스프린터 (단거리가속형)
⛰️ 클라이머 (산악형)
🚀 펀처 (순간폭발형)
⚡ 롤러/도메스틱 (평지장거리형)
🦾 올라운더 (밸런스형)
🐺 브레이커웨이 스페셜리스트 (장거리형)
🏋️ TT 스페셜리스트 (파워유지형)
예시)
📝 간단한 분석
🔥 라이딩스타일 : 스프린터 (단거리가속형)
📏 123km를 평균속도 26km/h로 소화한, 지속성과 효율 중심의 안정적 주행
🦵 109W 파워 + 💫 70rpm 케이던스로, 무리 없는 페이스와 순간 강도 대응이 균형

■ 훈련분석
스트림 데이터 분석 결과를 기반으로 지속성, 강도 변화, 리듬 측면의 주요 특징을 분석하고, 개선이 필요한 다음 훈련 요소를 예시와 같이 가독성이 높게 이모지도 포함해서 100자 이내로 제안해줘.예시의 폼은 유지해줘.
예시)
중강도 지속 주행
꾸준한 페달링과 높은 심박 체류로 유산소 한계 지점 도달

■ 회복 가이드
스트림 데이터 분석 결과를 기반으로 회복 필요 수준을 평가하고, 회복 방식(예: 휴식, 가벼운 회복라이딩, 스트레칭 등)을 예시와 같이 가독성이 높게 이모지도 포함해서 80자 이내로 제안해줘.예시의 폼은 유지해줘.
예시)
충분한 휴식 추천 (심박 회복 우선)

■ 다음 훈련 추천
스트림 데이터 분석 결과를 바탕으로 다음 훈련에서 진행할 구체적인 훈련법(시간, 세트 수, 목적 포함)을 예시와 같이 매번 반복적이지 않게 아래 참고내용을 참고해서 120자 이내로 제안해줘.예시의 폼은 유지해줘.
예시)
🏔 언덕 반복 훈련: 200~300m × 3세트 (???? 훈련)
 → 숨이 찰 때도 더 오래 버티는 능력 향상

[참고내용]
🕒 LSD 훈련
⚡ 인터벌 훈련
🔥 스위트스팟 훈련
⛰ 업힐 반복훈련
🏁 템포 훈련
🏋️ 스프린트 훈련
🔄 크로스 트레이닝

■ 중장기 목표
스트림 데이터 분석 결과를 바탕으로 향후 1~3개월간 중장기적으로 달성 가능한 훈련 목표를 예시와 같은 느낌으로 예시 템플릿 변경없이 80자~120자 이내로 제안해줘.(예: FTP 증가, 언덕 지속 능력 강화, 장거리 페이스 유지 등)
[ftp60]의 값이 0이거나 N/A나 None 값이면 값을 추측하지말고 0으로 표시해줘.예시의 폼은 유지해줘.
예시)
⏱ 현재 FTP: [ftp20]W(20분) / [ftp60]W(60분) 
⏱ 목표 FTP: ???~???W
⏱ 1~3개월간 Z4·스프린트 병행으로 FTP 및 지속파워 향상

■ 파워·심박 존 훈련 분석 (AI분석)
예시)
⚪ Z1 회복       : P ??% / H ??%
🔵 Z2 지구력    : P ??% / H ??%
🟢 Z3 템포       : P ??% / H ??%
🟠 Z4 임계       : P ??% / H ??%
🔴 Z5 최대산소 : P ??% / H ??%
🟣 Z6 무산소    : P ??%
⚡ Z7 스프린트 : P ??%
📌 Zone ?,? 중심의 안정적 유산소 훈련. Zone ? 체류가 길어 심폐지구력과 지방 연소에 효과적

■ 피크파워 분석 (AI분석)
피크파워분석의 데이터가 0이면 값을 추측하지말고 0으로 표현해줘
예시)
⏱️ 5초: ???W | 1분: ???W | 2분: ???W
⏱️ 5분: ???W | 10분: ???W | 30분: ???W | 1시간: ???W

■ 심박존 평균 분석 (AI분석)
심박존평균분석의 데이터가 0이면 값을 추측하지말고 0으로 표현해줘
예시)
❤️ 심박존 평균 분석 (AI분석)
Z1: [H_Z1]bpm / Z2: [H_Z2]bpm / Z3: [H_Z3]bpm
Z4: [H_Z4]bpm / Z5: [H_Z5]bpm

■ 회복 스트레칭
스트림 데이터 분석 결과를 기반으로,
근육 피로도를 고려해서 주요 스트레칭 대상 부위를 추천하고, 부위별로 시간, 스트레칭방법, 시간, 호흡 팁 등을 포함해 다양한 회복 스트레칭 방식을 매번 반복적이지 않게 150자 이내로 한글로 제안해줘.예시의 폼은 유지해줘.
예시)
🦵 대퇴사두, 햄스트링, 종아리, 둔근
⏱️ ??분간 / ??초씩 마사지, 깊은 호흡으로 이완

■ 회복 식단
스트림 데이터 분석 결과를 기반으로,
자전거 라이더의 회복을 위해 탄수화물·단백질·수분이 균형 잡힌 식단을 제안해줘.

조건:
1. 식단은 매번 다르게 구성하고, 같은 재료가 반복되지 않도록 한다. 
2. 탄수화물, 단백질, 수분 각각 최소 2가지 이상의 다양한 후보군을 고려한다.
   - 탄수화물 예시: 고구마, 감자, 옥수수, 현미밥, 파스타, 퀴노아, 귀리, 보리빵, 국수, 호밀빵, 옥수수빵, 잡곡밥 등
   - 단백질 예시: 닭가슴살, 연어, 참치, 두부, 병아리콩, 렌틸콩, 달걀, 코티지 치즈, 그릭 요거트, 소고기, 오리훈제, 돼지고기 안심 등
   - 수분/보조 예시: 전해질 음료, 코코넛 워터, 수박, 오렌지 주스, 아몬드 우유, 우유, 케일 스무디, 과일주스, 물 등
3. 칼로리는 대략 합산하여 kcal 단위로 제시한다.
4. 출력은 아래 형식을 따른다.

출력 형식:
🚴 [짧은 제목: 식단 성격 표현]
🍞 탄수화물: ???(???g) + ???(???g)
🍳 단백질: ???(???g) + ???(???g)
🥤 수분/보조: ???(???g) + ???(???g)
🔥 취득칼로리 : ?,???kcal

■ 오늘의 훈련 요약
이번 라이딩의 핵심 특징을 한 문장으로 요약하고, 사용자의 동기를 높일 수 있는 격려 문구를 함께 작성해줘. STRANK가 반드시 들어가고 함께 했다는 의미로 작성해줘.
예시)
 “오늘도 페달을 밟았다는 것만으로, 내일은 더 강해집니다.”
 STRANK와 함께한 오늘, 굿라이드였습니다! 🚴
(아래 3줄 빈줄을 넣어줘)`
    })

    // 요청 메시지 전체 출력
    console.log('\n' + '='.repeat(80))
    console.log('📤 GPT API 요청 메시지:')
    console.log('='.repeat(80))
    console.log(JSON.stringify(messages, null, 2))
    console.log('='.repeat(80))
    console.log('📤 요청 메시지 출력 완료\n')

    // GPT-5는 새로운 API 방식 사용
    const OpenAI = require('openai')
    const client = new OpenAI()
    
    // 메시지를 GPT-5 형식으로 변환 (스트림 데이터 분석 결과 포함)
    const gpt5Input = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')
    
    console.log('📊 토큰 수 줄이기:', {
      원본길이: messages.map(m => m.content.length).reduce((a, b) => a + b, 0),
      간소화길이: gpt5Input.length,
      절약률: `${Math.round((1 - gpt5Input.length / messages.map(m => m.content.length).reduce((a, b) => a + b, 0)) * 100)}%`
    })
    
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: gpt5Input,
      reasoning: { effort: "low" },  // 추론 노력 낮게 설정
      text: { verbosity: "low" }     // 출력 간결하게 설정
    })
    
    const text = response.output_text



    // 생성된 텍스트 전체 출력
    console.log('\n' + '='.repeat(80))
    console.log('📝 생성된 텍스트 전체 내용:')
    console.log('='.repeat(80))
    console.log(text)
    console.log('='.repeat(80))
    console.log('📝 텍스트 출력 완료\n')

    console.log('✓ GPT API 응답 수신:', {
      model: 'gpt-5',
      responseTime: new Date().toISOString(),
      textLength: text?.length || 0,
      responseData: response
    })

    if (!text) {
      logError('AI SDK가 빈 응답을 반환함', {
        functionName: 'generateActivityDescriptionWithGPT',
      })
      throw new Error(ERROR_CODES.OPENAI.DESCRIPTION_GENERATION_FAILED)
    }

    // 최종 생성된 텍스트 로깅
    console.log('✅ GPT 응답 완료:', {
      generatedText: text.substring(0, 500) + '...', // 생성된 텍스트의 앞부분만 로깅
      time: new Date().toISOString()
    })

    return text
  } catch (error: any) {
    // API 호출 한도 초과 에러 처리
    if (error.status === 429) {
      logError('OpenAI API 호출 한도 초과', {
        error,
        functionName: 'generateActivityDescriptionWithGPT',
      })
      throw new Error(ERROR_CODES.OPENAI.API_LIMIT_EXCEEDED)
    }

    // 기타 API 에러 처리
    logError('OpenAI API 호출 중 오류 발생', {
      error,
      functionName: 'generateActivityDescriptionWithGPT',
    })
    throw new Error(ERROR_CODES.OPENAI.API_ERROR)
  }
}
