/**
 * RFQ 이벤트(감사로그) 로깅 헬퍼 — 서버 사이드 전용
 */
import { createClient } from '@/lib/supabase/server'
import type { RfqEventType, ActorType } from '@/types/database'

interface LogRfqEventParams {
  rfqId: string
  quoteId?: string | null
  eventType: RfqEventType
  actorType: ActorType
  actorId?: string | null
  actorName?: string | null
  fromStatus?: string | null
  toStatus?: string | null
  message?: string | null
  metadata?: Record<string, unknown> | null
  isVisibleToDealer?: boolean
}

export async function logRfqEvent(params: LogRfqEventParams): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('rfq_events').insert({
    rfq_id: params.rfqId,
    quote_id: params.quoteId ?? null,
    event_type: params.eventType,
    actor_type: params.actorType,
    actor_id: params.actorId ?? null,
    actor_name: params.actorName ?? null,
    from_status: params.fromStatus ?? null,
    to_status: params.toStatus ?? null,
    message: params.message ?? null,
    metadata: params.metadata ?? null,
    is_visible_to_dealer: params.isVisibleToDealer ?? true,
  })

  if (error) {
    console.error('[logRfqEvent] 이벤트 기록 실패:', error.message, params)
  }
}
