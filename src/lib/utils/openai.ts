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
    const template = `🚴 STRANK AI 라이딩 리포트 (Pro)
📅 [년-월-일-요일]

🥇 거리 랭킹
📍[지역1] ([순위1]위)
📍[지역2] ([순위2]위)

🧗 고도 랭킹
📍[지역1] ([순위1]위)
📍[지역2] ([순위2]위)

🚴‍♂️ 라이딩 기록 요약
📏 총거리: [총거리] km
📈 총고도: [총고도] m
🚴‍♂️ 평균속도: [평균속도] km/h
💨 최고속도: [최고속도] km/h
⚡️ 최대파워: [최대파워] W
❤️ 최고심박수: [최고심박수] bpm
🔁 평균케이던스: [평균케이던스] rpm

📝 [총거리]km를 평균속도 [평균속도]km/h로 완주한 고효율 주행
📉 [평균파워]W 평균 파워, 💫 [평균케이던스]rpm 케이던스로 무리 없는 페이스 유지

🤖 AI 라이딩 코칭
📊 훈련포커스: [훈련포커스 요약]
[심박/파워/효율 관련 코멘트]

🔁 회복 가이드
[휴식일수]일 충분한 수면 & 휴식 ([회복 포인트 강조])

🗓 다음 훈련 추천
[훈련 형태]
[훈련 목적]

🎯 중장기 목표
[중장기 목표 요약]

📈 파워·심박 존 훈련 분석
🟢 Zone 1 (회복): P [Z1_P]% / H [Z1_H]%
🟡 Zone 2 (유산소): P [Z2_P]% / H [Z2_H]%
🟠 Zone 3 (지속): P [Z3_P]% / H [Z3_H]%
🔴 Zone 4 (고심박): P [Z4_P]% / H [Z4_H]%
🔥 Zone 5+ (무산소): P [Z5_P]% / H [Z5_H]%
✅ Zone 2~3 중심의 유산소 능력 발달 훈련

⚡ 피크파워 분석
5초: [P_5s]W / 1분: [P_1min]W / 2분: [P_2min]W
5분: [P_5min]W / 10분: [P_10min]W / 30분: [P_30min]W / 1시간: [P_1h]W

🧘‍♂️ 회복 스트레칭
[스트레칭 부위 나열]
[스트레칭 시간 및 방식]

🍌 회복 식단
[식단 요약]
[예시 식단1] / [예시 식단2]

📈 오늘의 훈련 요약
"[격려 문구]"
STRANK와 함께한 오늘, 고단하였으나 뿌듯한 하루 🚴‍♂️`

    // AI SDK를 사용한 텍스트 생성
    const { text } = await generateText({
      model: openai('gpt-4.1-mini'),
      temperature: 0.3,
      maxTokens: 3000,
      messages: [
        {
          role: 'system',
          content: '당신은 전문적인 사이클링 코치이자 데이터 분석가입니다. 라이더의 활동 데이터를 분석하여 인사이트를 제공하고, 개선을 위한 조언을 해주세요.'
        },
        {
          role: 'user',
          content: `주어진 템플릿의 형식을 정확히 유지하면서, [ ] 안의 내용을 실제 데이터로 채워주세요.
아래는 채워야 할 템플릿입니다:

${template}

채워 넣어야 할 데이터:
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
- 도시 거리 순위: ${rankingData.distanceRankCity || 'N/A'}
- 지역구 거리 순위: ${rankingData.distanceRankDistrict || 'N/A'}
- 도시 고도 순위: ${rankingData.elevationRankCity || 'N/A'}
- 지역구 고도 순위: ${rankingData.elevationRankDistrict || 'N/A'}\n`
    : ''
}

주의사항:
1. 템플릿의 모든 이모지와 포맷을 정확히 유지해주세요.
2. [ ] 안의 내용만 교체하고, 나머지 구조는 그대로 유지해주세요.
3. 순위를 표기할때는, 3위, 1위 등으로 순위만 표기해주세요.
4. 소수점 아래 데이터는 버림으로 처리해주세요.
5. 랭킹 데이터가 있는 경우 "[지역1]"은 "서울시"로, "[지역2]"는 실제 지역구 이름으로 교체해주세요.
6. 파워, 심박수, 케이던스 등 데이터가 없는 경우 다른 데이터를 기반으로 추정하여 적어주시고 '(추정)' 이라고 표시해주세요.
7. 훈련포커스, 회복 가이드, 다음 훈련 추천 등은 데이터를 분석하여 의미있는 인사이트를 제공해주세요.`
        }
      ]
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
