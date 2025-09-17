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

export const maxDuration = 300

// * 1. 웹훅 검증
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
      return NextResponse.json({ 'hub.challenge': challenge })
    }
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse('OK', { status: 200 })
}

// * 2. 활동 웹훅 이벤트 처리
export async function POST(request: NextRequest) {
  let webhookBody: StravaWebhookEventResponse

  try {
    webhookBody = await request.json()

    if (
      webhookBody.object_type !== 'activity' ||
      (webhookBody.aspect_type !== 'create' &&
        webhookBody.aspect_type !== 'delete' &&
        webhookBody.aspect_type !== 'update')
    ) {
      return new NextResponse('Not an activity event', { status: 200 })
    }

    const supabase = await createServiceRoleClient()

    const { error: insertError } = await supabase.from('strava_webhook_events').insert({
      event_time: webhookBody.event_time,
      object_id: webhookBody.object_id,
      object_type: webhookBody.object_type,
      aspect_type: webhookBody.aspect_type,
      owner_id: webhookBody.owner_id,
    })

    if (insertError?.code === '23505') {
      logError('Duplicate webhook event:', {
        event_time: webhookBody.event_time,
        object_id: webhookBody.object_id,
        aspect_type: webhookBody.aspect_type,
        error: insertError,
      })

      // ✅ create 이벤트만 무시
      if (webhookBody.aspect_type === 'create') {
        return new NextResponse('Duplicate create event ignored', { status: 200 })
      }
      // ✅ update/delete는 계속 진행
    }

    if (insertError && insertError.code !== '23505') {
      logError('Failed to record webhook event:', { error: insertError })
    }

    // ✅ 즉시 응답
    const response = new NextResponse('Success', { status: 200 })

    // ✅ 백그라운드 실행
    ;(async () => {
      try {
        switch (webhookBody.aspect_type) {
          case 'create':
            await new Promise(resolve => setTimeout(resolve, 2500))
            await processCreateActivityEvent(webhookBody)
            break
          case 'delete':
            await processDeleteActivityEvent(webhookBody)
            break
          case 'update':
            await processUpdateActivityEvent(webhookBody)
            break
        }
      } catch (err) {
        logError('Background job failed', {
          error: err,
          activityId: webhookBody.object_id,
        })
      }
    })()

    return response
  } catch (error) {
    logError('Webhook request parsing error:', { error })
    return new NextResponse(ERROR_MESSAGES[ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED], {
      status: 500,
    })
  }
}
