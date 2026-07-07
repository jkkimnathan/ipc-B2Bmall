/**
 * 견적서 자동 만료 처리 — 서버 사이드 전용
 *
 * quoted 상태이고 유효기한이 지난 경우
 * quotes → expired, quote_requests → expired로 자동 전환한다.
 * 거래처/관리자 상세 페이지 진입 시 호출.
 *
 * 쓰기는 service_role 클라이언트로 수행한다(거래처의 직접 쓰기 정책은 제거됨).
 * 조건부 전환(CAS)으로 동시 진입 시 중복 이벤트/부분 전환을 방지한다.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { isQuoteExpired } from '@/lib/rfq/expiry'
import { logRfqEvent } from '@/lib/rfq/events'

export async function checkAndExpireQuote(rfqId: string): Promise<{
  wasExpired: boolean
}> {
  const supabase = createAdminClient()

  // RFQ 상태 확인
  const { data: rfq } = await supabase
    .from('quote_requests')
    .select('id, status')
    .eq('id', rfqId)
    .maybeSingle()

  if (!rfq || rfq.status !== 'quoted') return { wasExpired: false }

  // 견적서 조회
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, valid_until, status')
    .eq('rfq_id', rfqId)
    .eq('status', 'sent')
    .maybeSingle()

  if (!quote || !isQuoteExpired(quote.valid_until)) return { wasExpired: false }

  // 조건부 전환(CAS): 아직 sent/quoted 인 경우에만 만료 처리.
  // 동시 진입 시 한 요청만 성공하여 중복 'expired' 이벤트를 막는다.
  const { data: expiredQuote, error: quoteErr } = await supabase
    .from('quotes')
    .update({ status: 'expired' })
    .eq('id', quote.id)
    .eq('status', 'sent')
    .select('id')

  if (quoteErr) {
    console.error('[checkAndExpireQuote] 견적서 만료 전환 실패:', quoteErr.message, { rfqId })
    return { wasExpired: false }
  }
  if (!expiredQuote?.length) {
    // 다른 요청이 이미 처리함
    return { wasExpired: false }
  }

  const { error: rfqErr } = await supabase
    .from('quote_requests')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('id', rfqId)
    .eq('status', 'quoted')

  if (rfqErr) {
    console.error('[checkAndExpireQuote] RFQ 만료 전환 실패 — 수동 확인 필요:', rfqErr.message, { rfqId })
    // 견적서는 이미 expired 로 전환됨. RFQ 는 다음 진입 시 재시도되도록 둔다.
  }

  await logRfqEvent({
    rfqId,
    quoteId: quote.id,
    eventType: 'expired',
    actorType: 'system',
    actorName: '시스템',
    fromStatus: 'quoted',
    toStatus: 'expired',
    message: '견적서 유효기한이 만료되었습니다.',
    isVisibleToDealer: true,
  })

  return { wasExpired: true }
}
