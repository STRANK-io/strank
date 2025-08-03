import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

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
})

// 랭킹 데이터 스키마 정의
const rankingDataSchema = z.object({
  distanceRankCity: z.number().nullable().optional(),
  distanceRankDistrict: z.number().nullable().optional(),
  elevationRankCity: z.number().nullable().optional(),
  elevationRankDistrict: z.number().nullable().optional(),
  district: z.string().optional(),
})

export async function generateActivityDescriptionWithGPT(
  activityData: z.infer<typeof activityDataSchema>,
  rankingData?: z.infer<typeof rankingDataSchema>
): Promise<string> {
  try {
    // API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      logError('OpenAI API 키가 설정되지 않음', {
        functionName: 'generateActivityDescriptionWithGPT',
      })
      throw new Error(ERROR_CODES.OPENAI.API_ERROR)
    }

    // 템플릿 준비
    const template = `
🚴 STRANK AI 라이딩 리포트
📅 [년-월-일-요일]

◾ 랭킹 정보 ◾

🥇 거리 랭킹
📍[지역1] ([순위1]위)
📍[지역2] ([순위2]위)

🥇 고도 랭킹
📍[지역1] ([순위1]위)
📍[지역2] ([순위2]위)

◾ 라이딩 분석 정보 ◾
🚴총거리: [총거리] km
🚵총고도: [총고도] m
🪫평균속도: [평균속도] km/h
🔋최고속도: [최고속도] km/h
🦵평균파워: [평균파워] W
🦿최대파워: [최대파워] W
❤️최고심박수: [최고심박수] bpm
💫평균케이던스: [평균케이던스] rpm

📝[한줄분석, 작성가이드에 맞춰 작성]

🧠 AI 라이딩 코칭
📊 훈련 분석
[작성가이드에 맞춰 작성]

🛌 회복 가이드
[작성가이드에 맞춰 작성]

💪 다음 훈련 추천
[작성가이드에 맞춰 작성]

🎯 중장기 목표
[작성가이드에 맞춰 작성]

📈 파워·심박 존 훈련 분석 (AI추측)
⚪ Zone 1 (회복): P [Z1_P]% / H [Z1_H]%
🔵 Zone 2 (유산소): P [Z2_P]% / H [Z2_H]%
🟢 Zone 3 (지속): P [Z3_P]% / H [Z3_H]%
🟠 Zone 4 (고심박): P [Z4_P]% / H [Z4_H]%
🔴 Zone 5+ (무산소): P [Z5_P]% / H [Z5_H]%
📌 Zone ?~? 중심의 유산소 능력 발달 훈련

⚡ 피크파워 분석 (AI추측)
5초: [P_5s]W / 1분: [P_1min]W / 2분: [P_2min]W
5분: [P_5min]W / 10분: [P_10min]W / 30분: [P_30min]W / 1시간: [P_1h]W

🧘‍♂️ 회복 스트레칭
[작성가이드에 맞춰 작성]

🥗 회복 식단 (AI추측)
[작성가이드에 맞춰 작성]

🧩 오늘의 훈련 요약
[작성가이드에 맞춰 작성]

🏆 Powered by STRANK`

    // AI SDK를 사용한 텍스트 생성
    console.log('🤖 GPT API 호출 시작:', {
      model: 'gpt-4.1-mini',
      time: new Date().toISOString()
    })

    const { text, response } = await generateText({
      model: openai('gpt-4.1-mini'),
      temperature: 0.75,
      maxTokens: 2048,
      messages: [
        {
          role: 'system',
          content: '당신은 사이클링 전문 코치이자 퍼포먼스 데이터 분석 전문가입니다. 사용자의 활동 데이터를 기반으로 정밀한 피트니스 인사이트를 제공하고, 준프로급 라이더를 목표로 효율적인 훈련 전략과 개선 방향을 제시합니다. 모든 분석은 실전 주행 데이터를 바탕으로 과학적이며 실용적으로 조금은 위트있게 전달되어야 합니다.'
        },
        {
          role: 'user',
          content: `
이 템플릿은 스트라바의 서드파티로 디스크립션에 작성되는 내용이야.
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

${
  rankingData
    ? `랭킹 데이터:
- 지역: ${rankingData.district}
- 도시 거리 순위: ${rankingData.distanceRankCity || ''}
- 지역구 거리 순위: ${rankingData.distanceRankDistrict || ''}
- 도시 고도 순위: ${rankingData.elevationRankCity || ''}
- 지역구 고도 순위: ${rankingData.elevationRankDistrict || ''}\n`
    : ''
}

※전체 주의사항
템플릿의 모든 이모지와 포맷, 그리고 정확한 단위 표기를 정확히 유지해줘.
[]안의 내용만 교체하고, 나머지 구조는 그대로 유지해줘.
훈련분석, 회복 가이드, 다음 훈련 추천, 중장기 목표 등은 라이딩 분석 정보 데이터를 분석하여 자전거 라이더들에게 의미있는 인사이트를 제공해줘. 자전거 전용 앱이므로, 자전거 훈련에 특화된 것들로 구체적으로 작성해줘.
취소선은 나타내지 말아줘.

※작성가이드
■한줄분석
총거리, 평균속도, 평균 파워, 평균 케이던스를 바탕으로 이번 주행의 페이스 조절, 리듬, 부하관리 관점에서 예시와 같이 요약해줘.
예시)
📏 123km를 평균속도 26km/h로 소화한, 지속성과 효율 중심의 안정적 주행
 🦵 109W 파워 + 💫 70rpm 케이던스로, 무리 없는 페이스와 순간 강도 대응이 균형

■ 훈련분석
이번 주행 데이터를 기반으로 지속성, 강도 변화, 리듬 측면의 주요 특징을 분석하고, 개선이 필요한 다음 훈련 요소를 예시와 같이 가독성이 높게 이모지도 포함해서 80자 이내로 제안해줘.
예시)
중강도 지속 주행
꾸준한 페달링과 높은 심박 체류로 유산소 한계 지점 도달

■ 회복 가이드
최고심박수, 평균강도, 피크파워 데이터를 기반으로 회복 필요 수준을 평가하고, 회복 시간과 회복 방식(예: 휴식, 가벼운 회복라이딩, 스트레칭 등)을 예시와 같이 가독성이 높게 이모지도 포함해서 80자 이내로 제안해줘.
예시)
?~??시간, 충분한 휴식 추천 (심박 회복 우선)

■ 다음 훈련 추천
이번 라이딩 기록을 바탕으로 다음 훈련에서 진행할 구체적인 훈련법(시간, 세트 수, 목적 포함)을 예시와 같이 매번 반복적이지 않게 다양한 방법으로 LSD훈련, 인터벌훈련, 스위트스팟훈련 등으로 평지, 언덕 등으로 그리고 훈련의 거리도 반드시 표현해줘 120자 이내로 제안해줘.
예시)
🏔 언덕 반복 훈련: 200~300m × 3세트 (???? 훈련)
 → 숨이 찰 때도 더 오래 버티는 능력 향상

■ 중장기 목표
현재 주행 데이터를 바탕으로 향후 1~3개월간 중장기적으로 달성 가능한 훈련 목표를 예시와 같은 느낌으로 조금 길게 100자 이내로 제안해줘.(예: FTP 증가, 언덕 지속 능력 강화, 장거리 페이스 유지 등)
예시)
 ⏱ 20분 이상 지속 강도로 밀어붙이는 능력 키우기
 ⏱ 현재 FTP: ???W 추정
 ⏱ 목표 FTP: ???~???W 목표 설정 권장

■ 파워·심박 존 훈련 분석 (AI 추측)
주행 기록을 기반으로 파워(P)와 심박수(H)의 Zone 1~5+ 구간별 비율을 추정해줘. 각 존별 퍼센트 수치를 제공하고, 이번 라이딩의 최고파워와 총고도를 고려해서 어느 존 중심으로 훈련되었는지도 분석해줘. 총고도가 300m 이상이면 파워·심박 존을 3~4존에 더 많이 비중을 주도록해. 만약, 라이딩 분석 데이터 (파워, 심박수, 케이던스 등 일부 데이터가 없는 경우)가 없다면, 다른 데이터를 기반으로 추정값을 넣어줘.
파워·심박 존 훈련 분석의 경우 주행 기록을 기반으로 파워(P)와 심박수(H)의 Zone 1~5+ 구간별 비율을 추정해줘. 각 존별 퍼센트 수치를 제공(구간의 합은 파워, 심박수 각각 100%로 표현, 예시. Zone 1 (회복): P 30% / H 70%))하고, 이번 라이딩이 어느 존 중심으로 훈련되었는지도 분석해줘.
예시와 같은 느낌으로 제안해줘.
예시)
 ⚪ Zone 1 (회복): P ??% / H ??%
 🔵 Zone 2 (유산소): P ??% / H ??%
 🟢 Zone 3 (지속 강도): P ??% / H ??%
 🟠 Zone 4 (고심박): P ??% / H ??%
 🔴 Zone 5+ (무산소최대): P ??% / H ??%
 📌 Zone ?,? 중심의 안정적 유산소 훈련. Zone ? 체류가 길어 심폐지구력과 지방 연소에 효과적

■ 피크파워 분석 (AI 추측)
피크파워를 산정할 때, 총이동거리, 총고도, 평균속도, 평균파워, 평균심박수 등을 종합해 AI 기반으로 피크파워를 추정해줘, 피크파워는 최고파워와 총고도를 고려해줘, 5초, 1분, 2분, 5분, 10분, 30분, 1시간 구간의 피크파워 W 단위로 세밀하게 산출해줘.
추정 조건
- 5초~2분 구간의 수치는 최대파워(W)를 참고해서 추정하는데 최대파워는 넘지말아줘
- 평균파워는 10분~1시간 구간 예측의 기반치로 활용
- 총고도가 낮고, 평균속도가 높을 경우, 고강도 스프린트 반복이 아닌 지속주행 중심으로 간주
- 평균심박수와 최대심박수의 차이가 클 경우 고강도 간헐적 구간 포함
예시)
 ⏱️ 5초: ???W | 1분: ???W | 2분: ???W
 ⏱️ 5분: ???W | 10분: ???W | 30분: ???W | 1시간: ???W

■ 회복 스트레칭
라이딩 부하와 근육 피로도를 고려해서 주요 스트레칭 대상 부위를 추천하고, 부위별로 시간, 스트레칭방법, 시간, 호흡 팁 등을 포함해 다양한 회복 스트레칭 방식을 매번 반복적이지 않게 예시와 같은 느낌으로 150자 이내로 제안해줘.
예시)
🦵 대퇴사두, 햄스트링, 종아리, 둔근
 ⏱️ ??분간 ??시간동안 / ??초,분씩 마사지, 깊은 호흡으로 이완

■ 회복 식단 (AI 추측)
이번 라이딩의 소모 칼로리와 지방 연소율(%)을 기반으로,
회복에 적합한 식단을 탄수화물·단백질·수분으로 나눠서 반복되지 않는 다양한 식단으로 구성해줘.
가급적 자전거 라이더에 준하는 식단으로 매번 반복적이지 않게 구성해줘.
예시)
 🚴 빠른 탄수화물과 가벼운 단백질로 회복
 🍞 바나나 1개 + 오트밀 또는 식빵 1장
 🍳 그릭요거트 또는 두부 100g + 삶은 달걀 1개
 🥤 이온음료 250ml 또는 물 + 소금 약간
 🔥 칼로리 : 1,865kcal
 🔥 지방 : 25g 소모 → 체지방 약 0.03kg 감량 효과

■ 오늘의 훈련 요약
이번 라이딩의 핵심 특징을 한 문장으로 요약하고, 사용자의 동기를 높일 수 있는 격려 문구를 함께 작성해줘. 예시는 변경되도 되는데, STRANK가 반드시 들어가고 함께 했다는 의미로 작성해줘.
예시)
 “오늘도 페달을 밟았다는 것만으로, 내일은 더 강해집니다.”
 STRANK와 함께한 오늘, 굿라이드였습니다! 🚴`
        }
      ]
    })

    console.log('✓ GPT API 응답 수신:', {
      modelId: response?.modelId,
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
