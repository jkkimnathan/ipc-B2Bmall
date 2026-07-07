/**
 * 발주 이벤트(감사로그) 로깅 헬퍼
 *
 * 서버 사이드 전용 — 서버 액션에서 호출하여
 * order_events 테이블에 이력을 기록한다.
 *
 * 라벨/아이콘/색상 등 표시 유틸은 event-utils.ts에서 import할 것.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderEventType, ActorType } from '@/types/database'

interface LogOrderEventParams {
  orderId: string
  eventType: OrderEventType
  actorType: ActorType
  actorId?: string | null
  actorName?: string | null
  fromStatus?: string | null
  toStatus?: string | null
  message?: string | null
  metadata?: Record<string, unknown> | null
  isVisibleToDealer?: boolean
}

/**
 * order_events 테이블에 이벤트 한 건을 기록한다.
 * 감사 로그이므로 위조 방지를 위해 service_role 클라이언트로만 기록한다.
 * (거래처의 직접 INSERT 정책은 제거됨 — 018 마이그레이션 참조)
 */
export async function logOrderEvent(params: LogOrderEventParams): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from('order_events').insert({
    order_id: params.orderId,
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
    console.error('[logOrderEvent] 이벤트 기록 실패:', error.message, params)
  }
}
