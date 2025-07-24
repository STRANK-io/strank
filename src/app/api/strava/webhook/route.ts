import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { StravaWebhookEventResponse } from '@/lib/types/strava'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import {
  processCreateActivityEvent,
  processDeleteActivityEvent,
  processUpdateActivityEvent,
} from '@/lib/utils/webhook'

export const maxDuration = 20 // hobby 플랜 max duration은 기본 10, 최대 60초

// * 1. 웹훅 검증을 위한 GET 요청 처리
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // 웹훅 검증을 위한 요청인 경우
  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
      return NextResponse.json({ 'hub.challenge': challenge })
    }
    return new NextResponse('Forbidden', { status: 403 })
  }

  // 일반적인 GET 요청 (콜백 URL 확인용)
  return new NextResponse('OK', { status: 200 })
}

// * 2. 활동 웹훅 이벤트 처리
export async function POST(request: NextRequest) {
  try {
    const webhookBody = await request.json()
    
    console.log('📥 웹훅 수신:', {
      aspect_type: webhookBody.aspect_type,
      object_type: webhookBody.object_type,
      object_id: webhookBody.object_id,
      owner_id: webhookBody.owner_id,
      time: new Date().toISOString()
    })

    // 즉시 200 응답 반환
    const response = new NextResponse('Success', { status: 200 })

    // 백그라운드에서 처리 시작
    queueMicrotask(async () => {
      try {
        console.log('🔄 백그라운드 처리 시작:', {
          type: webhookBody.aspect_type,
          id: webhookBody.object_id,
          time: new Date().toISOString()
        })

        // 활동 이벤트가 아닌 경우 처리하지 않음
        if (
          webhookBody.object_type !== 'activity' ||
          (webhookBody.aspect_type !== 'create' &&
            webhookBody.aspect_type !== 'delete' &&
            webhookBody.aspect_type !== 'update')
        ) {
          console.log('⚠️ 활동 이벤트가 아님, 스킵')
          return
        }

        const supabase = await createServiceRoleClient()

        // 웹훅 이벤트 기록
        const { error: insertError } = await supabase.from('strava_webhook_events').insert({
          event_time: webhookBody.event_time,
          object_id: webhookBody.object_id,
          object_type: webhookBody.object_type,
          aspect_type: webhookBody.aspect_type,
          owner_id: webhookBody.owner_id,
        })

        // 중복 이벤트 체크
        if (insertError?.code === '23505') {
          console.log('⚠️ 중복 웹훅 이벤트, 스킵:', {
            id: webhookBody.object_id,
            time: new Date().toISOString()
          })
          return
        }

        if (insertError) {
          console.error('❌ 웹훅 이벤트 기록 실패:', {
            error: insertError,
            time: new Date().toISOString()
          })
        }

        // 2.5초 대기 (서드파티 서비스와의 충돌 방지)
        console.log('⏳ 대기 시작 (2.5초)')
        await new Promise(resolve => setTimeout(resolve, 2500))
        console.log('✓ 대기 완료')

        // 이벤트 타입에 따른 처리
        switch (webhookBody.aspect_type) {
          case 'create':
            console.log('📝 활동 생성 처리 시작')
            await processCreateActivityEvent(webhookBody)
            console.log('✓ 활동 생성 처리 완료')
            break
          case 'delete':
            console.log('🗑 활동 삭제 처리 시작')
            await processDeleteActivityEvent(webhookBody)
            console.log('✓ 활동 삭제 처리 완료')
            break
          case 'update':
            console.log('✏️ 활동 업데이트 처리 시작')
            await processUpdateActivityEvent(webhookBody)
            console.log('✓ 활동 업데이트 처리 완료')
            break
        }

        // 처리 완료 기록
        const { error: updateError } = await supabase
          .from('strava_webhook_events')
          .update({ processed_at: new Date().toISOString() })
          .eq('object_id', webhookBody.object_id)
          .is('processed_at', null)

        if (updateError) {
          console.error('❌ 처리 완료 기록 실패:', {
            error: updateError,
            time: new Date().toISOString()
          })
        }

        console.log('✨ 웹훅 처리 완료:', {
          id: webhookBody.object_id,
          type: webhookBody.aspect_type,
          time: new Date().toISOString()
        })
      } catch (error) {
        console.error('❌ 백그라운드 처리 중 오류:', {
          error,
          id: webhookBody.object_id,
          type: webhookBody.aspect_type,
          time: new Date().toISOString()
        })
      }
    })

    return response
  } catch (error) {
    console.error('❌ 웹훅 요청 파싱 오류:', {
      error,
      time: new Date().toISOString()
    })
    return new NextResponse('Error', { status: 500 })
  }
}
