import { ERROR_CODES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { generateRankingSection } from '@/lib/utils/description'
import { analyzeStreamData } from '@/lib/utils/streamAnalyzer'
import OpenAI from 'openai'
const client = new OpenAI()

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.')
}

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

const rankingDataSchema = z.object({
  distanceRankCity: z.number().nullable(),
  distanceRankDistrict: z.number().nullable(),
  elevationRankCity: z.number().nullable(),
  elevationRankDistrict: z.number().nullable(),
  district: z.string(),
  province: z.string(),
})

export async function generateActivityDescriptionWithGPT(
  userId: string,
  activityData: z.infer<typeof activityDataSchema>,
  rankingData?: z.infer<typeof rankingDataSchema>
): Promise<string> {
  
  const messages: Array<{ role: 'system' | 'user'; content: string }> = []
  
  let streamAnalysis = null
  if (activityData.streamsData) {
    try {
      console.log('\n📊 스트림 데이터 분석 시작...')
      streamAnalysis = await analyzeStreamData(userId, activityData.streamsData)
      console.log('✅ 스트림 데이터 분석 완료\n')
    } catch (error) {
      console.log('❌ 스트림 데이터 분석 실패:', error)
      console.log('📝 원본 데이터로 진행합니다\n')
    }
  }

const hasPowerData = streamAnalysis?.hasPowerData ?? false

  try {
    if (!process.env.OPENAI_API_KEY) {
      logError('OpenAI API 키가 설정되지 않음', {
        functionName: 'generateActivityDescriptionWithGPT',
      })
      throw new Error(ERROR_CODES.OPENAI.API_ERROR)
    }

    console.log('📊 랭킹 데이터:', {
      rankingData,
      time: new Date().toISOString()
    })

    const rankingSection = rankingData
      ? generateRankingSection({
          rankings: rankingData,
          district: rankingData.district || '',
          province: rankingData.province || '지역 없음'
        })
      : ''
    
    console.log('📝 생성된 랭킹 섹션:', {
      rankingSection,
      time: new Date().toISOString()
    })

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

🔍라이딩 분석 정보
🚴총거리: [총거리] km
🚵총고도: [총고도] m
🪫평균속도: [평균속도] km/h
🔋최고속도: [최고속도] km/h
🦵평균파워: [평균파워] W
🦿최대파워: [최대파워] W
❤️최고심박수: [최고심박수] bpm
💫평균케이던스: [평균케이던스] rpm

📍코스구간
👉 [courseName]

📝 간단한분석
[작성가이드에 맞춰 작성]

🧠 AI 라이딩 코칭
📊 훈련 분석
[작성가이드에 맞춰 작성]

💪 다음 훈련 추천
[작성가이드에 맞춰 작성]

🎯 중장기 목표
[작성가이드에 맞춰 작성]

📈 파워·심박 존 훈련 분석
[작성가이드에 맞춰 작성]

⚡ 피크파워 분석
5초: [P_5s]W / 1분: [P_1min]W / 2분: [P_2min]W
5분: [P_5min]W / 10분: [P_10min]W / 20분: [P_20min]W / 1시간: [P_1h]W

❤️ 심박존 평균 분석
Z1: [H_Z1]bpm / Z2: [H_Z2]bpm / Z3: [H_Z3]bpm
Z4: [H_Z4]bpm / Z5: [H_Z5]bpm

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
- courseName: ${
  (streamAnalysis as any)?.courseName 
    || (
      (activityData?.streamsData?.latlng?.data?.length ?? 0) < 5 
      || (activityData as any)?.trainer === true 
      || (activityData as any)?.type === 'VirtualRide'
        ? '실내 트레이닝'
        : '등록된 코스 없음'
    )
}

FTP 분석:
- 60분 FTP: ${streamAnalysis.ftp60 || 'N/A'}W

파워존 분포:
- Z1: ${streamAnalysis.powerZoneRatios.Z1}% / Z2: ${streamAnalysis.powerZoneRatios.Z2}% / Z3: ${streamAnalysis.powerZoneRatios.Z3}% / Z4: ${streamAnalysis.powerZoneRatios.Z4}% / Z5: ${streamAnalysis.powerZoneRatios.Z5}% / Z6: ${streamAnalysis.powerZoneRatios.Z6 || 0}% / Z7: ${streamAnalysis.powerZoneRatios.Z7 || 0}%

- Z1-3: ${streamAnalysis.powerZoneRatios.Z1 + streamAnalysis.powerZoneRatios.Z2 + streamAnalysis.powerZoneRatios.Z3}%
- Z4-6: ${streamAnalysis.powerZoneRatios.Z4 + streamAnalysis.powerZoneRatios.Z5 + streamAnalysis.powerZoneRatios.Z6}%

심박존 분포:
- Z1: ${streamAnalysis.hrZoneRatios.Z1}% / Z2: ${streamAnalysis.hrZoneRatios.Z2}% / Z3: ${streamAnalysis.hrZoneRatios.Z3}% / Z4: ${streamAnalysis.hrZoneRatios.Z4}% / Z5: ${streamAnalysis.hrZoneRatios.Z5}%

- Z1-2: ${streamAnalysis.hrZoneRatios.Z1 + streamAnalysis.hrZoneRatios.Z2}%
- Z3-4: ${streamAnalysis.hrZoneRatios.Z3 + streamAnalysis.hrZoneRatios.Z4}%

피크파워 분석:
- 5초: ${streamAnalysis.peakPowers['5s']}W / 1분: ${streamAnalysis.peakPowers['1min']}W / 2분: ${streamAnalysis.peakPowers['2min']}W
- 5분: ${streamAnalysis.peakPowers['5min']}W / 10분: ${streamAnalysis.peakPowers['10min']}W / 20분: ${streamAnalysis.peakPowers['20min']}W / 1시간: ${streamAnalysis.peakPowers['1h']}W

심박존 평균:
- Z1: ${streamAnalysis.hrZoneAverages.Z1}bpm / Z2: ${streamAnalysis.hrZoneAverages.Z2}bpm / Z3: ${streamAnalysis.hrZoneAverages.Z3}bpm
- Z4: ${streamAnalysis.hrZoneAverages.Z4}bpm / Z5: ${streamAnalysis.hrZoneAverages.Z5}bpm

라이딩스타일:
${streamAnalysis.riderStyle.icon} ${streamAnalysis.riderStyle.name} - ${streamAnalysis.riderStyle.desc}
` : ''}

※전체 주의사항
템플릿의 모든 이모지와 포맷, 그리고 데이터 표기를 정수로 유지해줘.
[]안의 내용만 교체하고, 나머지 구조는 그대로 유지해줘.
자전거 라이더에게 의미있는 인사이트를 제공해줘.
모든 내용에 단위를 제외하고는 반드시 한국어만 사용해줘.
모든 내용에 존표시는 파워 또는 심박이라고 명시를 해줘서 분명하게 해석되도록 유도해줘.
※조건 규칙
- 파워데이터 상태가 "스트림에 파워데이터 없음"일 경우, 반드시 "파워데이터가 없을 때" 섹션의 형식을 사용하라.
- 파워데이터 상태가 "스트림에 파워데이터 있음"일 경우, 반드시 "파워데이터가 있을때" 섹션의 형식을 사용하라.


※작성가이드
■ 간단한분석
${streamAnalysis ? `${streamAnalysis.riderStyle.icon} 라이딩스타일 : ${streamAnalysis.riderStyle.name}
📏 [총거리]km / 평균속도 [평균속도]km/h, ${streamAnalysis.riderStyle.desc}` : ''}
🦵 [평균파워]W + 💫 [평균케이던스]rpm, 페이스와 리듬 해석 추가

■ 훈련분석
스트림 데이터 분석 결과를 기반으로 지속성, 강도 변화, 리듬 측면의 주요 특징을 분석하고, 개선이 필요한 다음 훈련 요소를 예시와 같이 가독성이 높게 150자 이내로 제안해줘.
예시)
중강도 지속 주행
꾸준한 페달링과 높은 심박 체류로 유산소 한계 지점 도달

■ 다음 훈련 추천
스트림 데이터 분석 결과를 바탕으로 다음 훈련에서 진행할 구체적인 훈련법(시간, 세트 수, 목적 포함)을 참고내용을 참고해서 예시와 같이 매번 반복적이지 않게 가독성이 높게 150자 이내로 제안해줘.
예시)
🏔 ?? ?? 훈련: ???~???m × ?세트 (???? 훈련)
 → ???????????????????????????

[참고내용]
🕒 LSD 훈련
⚡ 인터벌 훈련
🔥 스위트스팟 훈련
⛰ 업힐 반복 훈련
🏁 템포 훈련
🏋️ 스프린트 훈련
🔄 크로스 트레이닝

■ 중장기 목표
스트림 데이터 분석 결과를 바탕으로 향후 달성 가능한 훈련 목표를 예시와 같이 템플릿 변경없이 150자 이내로 제안해줘.
- 목표는 단순 수치가 아니라 ‘훈련 방향 + 기대 변화’를 포함해야 한다.
- 예: FTP 향상, 언덕 지속능력 강화, 페이스 유지력 향상, 회복 리듬 개선 등
- 과장된 표현(극단적 향상 등)은 피하고 현실적 수준으로 작성할 것.
[ftp60]이 0, N/A, None이면 데이터를 추측하지 말고, 아래 형식을 그대로 사용하라.
데이터가 없을 경우 아래 형식을 그대로 사용하라.
🎯 중장기 목표
⏱ 파워 프로필: 데이터 부족 (짧은 주행)
⏱ 목표 FTP: 데이터 부족

데이터가 있을 경우:
🎯 중장기 목표
⏱ 파워 프로필: FTP [ftp60]W
⏱ 목표 FTP: ???W (약 +?% 향상)
🏁 <!-- 훈련 방향과 기대 효과를 1~2문장으로 간결히 제시하라 -->

■ 파워·심박 존 훈련 분석
스트림 데이터 분석 결과를 기반으로 이번 훈련 결과를 150자 이내로 제안해줘. 예시의 폼은 유지해줘.
- 파워데이터 상태: ${hasPowerData ? '스트림에 파워데이터 있음' : '스트림에 파워데이터 없음'}

파워데이터가 있을때 :
⚪ Z1 회복       : P [Z1_P]% / H [Z1_H]%
🔵 Z2 지구력    : P [Z2_P]% / H [Z2_H]%
🟢 Z3 템포       : P [Z3_P]% / H [Z3_H]%
🟠 Z4 임계       : P [Z4_P]% / H [Z4_H]%
🔴 Z5 최대산소 : P [Z5_P]% / H [Z5_H]%
🟣 Z6 무산소    : P [Z6_P]%
⚡ Z7 스프린트 : P [Z7_P]%
📌 <!-- 파워, 심박을 기반으로 훈련내용을 1~2문장으로 간결히 제시하라 -->

파워데이터가 없을 때 :
⚪ 회복/지속: P [Z1-3_P]% / H [Z1-2_H]%
🔵 템포/임계: P [Z4-6_P]% / H [Z3-4_H]%
🔴 고강도: P [Z7_P]% / H [Z5_H]%
📌 <!-- 파워, 심박을 기반으로 훈련내용을 1~2문장으로 간결히 제시하라 -->

■ 피크파워 분석
피크파워분석의 데이터가 0이면 값을 추측하지말고 0으로 표현해줘
예시)
⏱️ 5초: ???W | 1분: ???W | 2분: ???W
⏱️ 5분: ???W | 10분: ???W | 20분: ???W | 1시간: ???W

■ 심박존 평균 분석
심박존평균분석의 데이터가 0이면 값을 추측하지말고 0으로 표현해줘
예시)
❤️ 심박존 평균 분석
Z1: [H_Z1]bpm / Z2: [H_Z2]bpm / Z3: [H_Z3]bpm
Z4: [H_Z4]bpm / Z5: [H_Z5]bpm

■ 오늘의 훈련 요약
이번 라이딩의 핵심 특징을 한 문장으로 요약하고, 사용자의 동기를 높일 수 있는 격려 문구를 함께 작성해줘. STRANK가 반드시 들어가고 함께 했다는 의미로 작성해줘.
예시)
 “????????????????, ??????????”
 STRANK??????????????, ????????????🚴`
    })

    console.log('\n' + '='.repeat(80))
    console.log('📤 GPT API 요청 메시지:')
    console.log('='.repeat(80))
    console.log(JSON.stringify(messages, null, 2))
    console.log('='.repeat(80))
    console.log('📤 요청 메시지 출력 완료\n')

    const gpt5Input = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')
    
    console.log('📊 토큰 수 줄이기:', {
      원본길이: messages.map(m => m.content.length).reduce((a, b) => a + b, 0),
      간소화길이: gpt5Input.length,
      절약률: `${Math.round((1 - gpt5Input.length / messages.map(m => m.content.length).reduce((a, b) => a + b, 0)) * 100)}%`
    })
    
    const response = await client.responses.create({
      model: "gpt-5-mini-2025-08-07",
      input: gpt5Input,
      reasoning: { effort: "low" },
      response_format: { type: "text" }
    })
    
    const text = response.output_text

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

    console.log('✅ GPT 응답 완료:', {
      generatedText: text.substring(0, 500) + '...', // 생성된 텍스트의 앞부분만 로깅
      time: new Date().toISOString()
    })

    return text
  } catch (error: any) {
    if (error.status === 429) {
      logError('OpenAI API 호출 한도 초과', {
        error,
        functionName: 'generateActivityDescriptionWithGPT',
      })
      throw new Error(ERROR_CODES.OPENAI.API_LIMIT_EXCEEDED)
    }

    logError('OpenAI API 호출 중 오류 발생', {
      error,
      functionName: 'generateActivityDescriptionWithGPT',
    })
    throw new Error(ERROR_CODES.OPENAI.API_ERROR)
  }
}
