import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { StravaWebhookEventResponse } from '@/lib/types/strava'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import { processWebhookEvent } from '@/lib/utils/webhook'

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

// * 2. 활동 업데이트 시 웹훅 온 이벤트 처리
export async function POST(request: NextRequest) {
  let webhookBody: StravaWebhookEventResponse

  try {
    webhookBody = await request.json()

    // * 활동 생성 이벤트만 처리
    if (webhookBody.aspect_type !== 'create' || webhookBody.object_type !== 'activity') {
      return new NextResponse('Not a new activity', { status: 200 })
    }

    const supabase = await createServiceRoleClient()

    // * 중복 체크를 위해 웹훅 이벤트 기록
    const { error: insertError } = await supabase.from('strava_webhook_events').insert({
      event_time: webhookBody.event_time,
      object_id: webhookBody.object_id,
      object_type: webhookBody.object_type,
      aspect_type: webhookBody.aspect_type,
      owner_id: webhookBody.owner_id,
    })

    // * 중복 이벤트인 경우 처리 (유니크 제약조건 위반)
    if (insertError?.code === '23505') {
      logError('Duplicate webhook event:', {
        event_time: webhookBody.event_time,
        object_id: webhookBody.object_id,
        error: insertError,
      })
      return new NextResponse('Duplicate event', { status: 200 })
    }

    // * 다른 에러가 발생한 경우
    if (insertError) {
      // 웹훅 이벤트 기록에 실패하더라도 처리는 진행
      logError('Failed to record webhook event:', { error: insertError })
    }

    await processWebhookEvent(webhookBody)

    return new NextResponse('Success', {
      status: 200,
    })
  } catch (error) {
    logError('Webhook request parsing error:', { error })
    return new NextResponse(ERROR_MESSAGES[ERROR_CODES.STRAVA_ACTIVITY_UPDATE_FAILED], {
      status: 500,
    })
  }
}
