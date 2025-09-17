import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { StravaWebhookEventResponse } from '@/lib/types/strava'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { logError } from '@/lib/utils/log'
import {
  processCreateActivityEvent,
  processDeleteActivityEvent,
  processUpdateActivityEvent,
} from '@/lib/utils/webhook'

// ✅ Vercel Edge Runtime 사용
export const runtime = 'edge'

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
        error: insertError,
      })
      return new NextResponse('Duplicate event', { status: 200 })
    }

    if (insertError) {
      logError('Failed to record webhook event:', { error: insertError })
    }

    // ✅ 즉시 OK 응답 준비
    const response = new NextResponse('Success', { status: 200 })

    // ✅ Background Job 실행 (응답 이후에도 계속 실행됨)
    request.waitUntil((async () => {
      try {
        switch (webhookBody.aspect_type) {
          case 'create':
            // 2.5초 딜레이 (Strava/서드파티 충돌 방지)
            await new Promise(r => setTimeout(r, 2500))
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
    })())

    // ✅ Strava에 즉시 성공 응답
    return response
  } catch (error) {
    logError('Webhook request parsing error:', { error })
    return new NextResponse(ERROR_MESSAGES[ERROR_CODES.STRAVA.ACTIVITY_UPDATE_FAILED], {
      status: 500,
    })
  }
}
