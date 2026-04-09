/**
 * 견적서 자동 만료 처리 — 서버 사이드 전용
 *
 * quoted 상태이고 유효기한이 지난 경우
 * quotes → expired, quote_requests → expired로 자동 전환한다.
 * 거래처/관리자 상세 페이지 진입 시 호출.
 */
import { createClient } from '@/lib/supabase/server'
import { isQuoteExpired } from '@/lib/rfq/expiry'
import { logRfqEvent } from '@/lib/rfq/events'

export async function checkAndExpireQuote(rfqId: string): Promise<{
  wasExpired: boolean
}> {
  const supabase = await createClient()

  // RFQ 상태 확인
  const { data: rfq } = await supabase
    .from('quote_requests')
    .select('id, status')
    .eq('id', rfqId)
    .single()

  if (!rfq || rfq.status !== 'quoted') return { wasExpired: false }

  // 견적서 조회
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, valid_until, status')
    .eq('rfq_id', rfqId)
    .eq('status', 'sent')
    .single()

  if (!quote || !isQuoteExpired(quote.valid_until)) return { wasExpired: false }

  // 만료 처리
  await supabase
    .from('quotes')
    .update({ status: 'expired' })
    .eq('id', quote.id)

  await supabase
    .from('quote_requests')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('id', rfqId)

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
