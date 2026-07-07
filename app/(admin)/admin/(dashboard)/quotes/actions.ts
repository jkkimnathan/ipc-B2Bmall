'use server'

/**
 * 관리자 견적서 작성/발송 서버 액션
 */
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { logRfqEvent } from '@/lib/rfq/events'
import { calcValidUntil, formatKRW, formatDate, toSafeInt } from '@/lib/utils/format'
import { sendEmail } from '@/lib/email/send'
import { getDealerEmailForRfq, getSiteUrl } from '@/lib/email/helpers'
import QuoteSentToDealerEmail from '@/components/emails/QuoteSentToDealerEmail'

/** quote_no 생성 */
function generateQuoteNo(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '')
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `Q-${date}-${time}-${rand}`
}

function revalidateQuotePaths(rfqId: string) {
  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${rfqId}`)
  revalidatePath('/dealer/quotes')
  revalidatePath(`/dealer/quotes/${rfqId}`)
  revalidatePath('/admin')
}

/** FormData에서 견적 데이터 추출 */
function extractQuoteData(formData: FormData) {
  const specJsonStr = formData.get('spec_json') as string
  const proposedSpec = formData.get('proposed_spec') as string | null
  const vatIncluded = formData.get('vat_included') === 'true'
  const adminMemo = formData.get('admin_memo') as string | null

  // 숫자 필드 안전 파싱 (NaN/소수/범위밖이면 null → 검증 실패 처리)
  const unitPrice = toSafeInt(formData.get('unit_price'), { min: 0 })
  const quantity = toSafeInt(formData.get('quantity'), { min: 1 })
  const leadTimeDays = toSafeInt(formData.get('lead_time_days') || '7', { min: 1 })
  const validDays = toSafeInt(formData.get('valid_days') || '7', { min: 1, max: 365 })

  if (unitPrice === null) throw new Error('단가를 올바르게 입력해주세요.')
  if (quantity === null) throw new Error('수량을 올바르게 입력해주세요.')
  if (leadTimeDays === null) throw new Error('납기(영업일)를 올바르게 입력해주세요.')
  if (validDays === null) throw new Error('견적 유효기간(일)을 올바르게 입력해주세요.')

  let specJson: unknown
  try {
    specJson = JSON.parse(specJsonStr || '{}')
  } catch {
    throw new Error('사양 정보 형식이 올바르지 않습니다.')
  }
  const totalAmount = unitPrice * quantity

  return {
    specJson,
    proposedSpec: proposedSpec?.trim() || '',
    unitPrice,
    quantity,
    vatIncluded,
    totalAmount,
    leadTimeDays,
    validUntil: calcValidUntil(validDays),
    adminMemo: adminMemo?.trim() || null,
  }
}

// ============================================================
// 임시저장
// ============================================================

export async function saveQuoteDraft(
  rfqId: string,
  formData: FormData
): Promise<{ quoteId: string }> {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const { data: rfq } = await supabase
    .from('quote_requests')
    .select('id, status')
    .eq('id', rfqId)
    .single()

  if (!rfq) throw new Error('견적 요청을 찾을 수 없습니다.')
  if (!['submitted', 'quoted'].includes(rfq.status)) {
    throw new Error('이미 진행된 견적 요청입니다.')
  }

  const d = extractQuoteData(formData)

  // 기존 quote 있는지 확인 (0건/2건 이상이어도 에러 없이 처리)
  const { data: existing } = await supabase
    .from('quotes')
    .select('id')
    .eq('rfq_id', rfqId)
    .maybeSingle()

  let quoteId: string

  if (existing) {
    // UPDATE
    const { error } = await supabase
      .from('quotes')
      .update({
        spec_json: d.specJson,
        proposed_spec: d.proposedSpec,
        unit_price: d.unitPrice,
        quantity: d.quantity,
        total_amount: d.totalAmount,
        vat_included: d.vatIncluded,
        lead_time_days: d.leadTimeDays,
        valid_until: d.validUntil,
        admin_memo: d.adminMemo,
        status: 'draft',
      })
      .eq('id', existing.id)

    if (error) throw new Error('임시저장 실패: ' + error.message)
    quoteId = existing.id
  } else {
    // INSERT
    const { data: newQuote, error } = await supabase
      .from('quotes')
      .insert({
        quote_no: generateQuoteNo(),
        rfq_id: rfqId,
        spec_json: d.specJson,
        proposed_spec: d.proposedSpec,
        unit_price: d.unitPrice,
        quantity: d.quantity,
        total_amount: d.totalAmount,
        vat_included: d.vatIncluded,
        lead_time_days: d.leadTimeDays,
        valid_until: d.validUntil,
        admin_memo: d.adminMemo,
        status: 'draft',
      })
      .select('id')
      .single()

    if (error || !newQuote) throw new Error('임시저장 실패: ' + (error?.message ?? ''))
    quoteId = newQuote.id
  }

  await logRfqEvent({
    rfqId,
    quoteId,
    eventType: 'quote_draft_saved',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    message: '견적서를 임시저장했습니다.',
    isVisibleToDealer: false,
  })

  revalidateQuotePaths(rfqId)
  return { quoteId }
}

// ============================================================
// 견적서 발송 (첫 발송 또는 재견적)
// ============================================================

export async function sendQuote(
  rfqId: string,
  formData: FormData
): Promise<{ quoteId: string }> {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const { data: rfq } = await supabase
    .from('quote_requests')
    .select('id, status, rfq_no, title, dealer_id')
    .eq('id', rfqId)
    .single()

  if (!rfq) throw new Error('견적 요청을 찾을 수 없습니다.')
  if (!['submitted', 'quoted'].includes(rfq.status)) {
    throw new Error('이미 진행된 견적 요청입니다.')
  }

  const d = extractQuoteData(formData)

  // 기존 quote 있는지 확인 (0건/2건 이상이어도 에러 없이 처리)
  const { data: existing } = await supabase
    .from('quotes')
    .select('id, status')
    .eq('rfq_id', rfqId)
    .maybeSingle()

  const isRevise = existing?.status === 'sent'
  let quoteId: string

  if (existing) {
    const { error } = await supabase
      .from('quotes')
      .update({
        spec_json: d.specJson,
        proposed_spec: d.proposedSpec,
        unit_price: d.unitPrice,
        quantity: d.quantity,
        total_amount: d.totalAmount,
        vat_included: d.vatIncluded,
        lead_time_days: d.leadTimeDays,
        valid_until: d.validUntil,
        admin_memo: d.adminMemo,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) throw new Error('발송 실패: ' + error.message)
    quoteId = existing.id
  } else {
    const { data: newQuote, error } = await supabase
      .from('quotes')
      .insert({
        quote_no: generateQuoteNo(),
        rfq_id: rfqId,
        spec_json: d.specJson,
        proposed_spec: d.proposedSpec,
        unit_price: d.unitPrice,
        quantity: d.quantity,
        total_amount: d.totalAmount,
        vat_included: d.vatIncluded,
        lead_time_days: d.leadTimeDays,
        valid_until: d.validUntil,
        admin_memo: d.adminMemo,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !newQuote) throw new Error('발송 실패: ' + (error?.message ?? ''))
    quoteId = newQuote.id
  }

  // RFQ 상태를 quoted로 전환 (조회 시점 상태와 동일할 때만 — CAS)
  const { data: rfqUpdated, error: rfqUpdateError } = await supabase
    .from('quote_requests')
    .update({ status: 'quoted', updated_at: new Date().toISOString() })
    .eq('id', rfqId)
    .eq('status', rfq.status)
    .select('id')

  if (rfqUpdateError) throw new Error('견적 요청 상태 갱신 실패: ' + rfqUpdateError.message)
  if (!rfqUpdated?.length) throw new Error('이미 진행된 견적 요청입니다. 새로고침 후 다시 확인해주세요.')

  await logRfqEvent({
    rfqId,
    quoteId,
    eventType: isRevise ? 'quote_revised' : 'quote_sent',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    fromStatus: rfq.status,
    toStatus: 'quoted',
    message: isRevise
      ? `재견적 발송. 단가 ${d.unitPrice.toLocaleString()}원 x ${d.quantity}대`
      : `견적서 발송. 단가 ${d.unitPrice.toLocaleString()}원 x ${d.quantity}대 = ${d.totalAmount.toLocaleString()}원`,
    isVisibleToDealer: true,
  })

  revalidateQuotePaths(rfqId)

  // 거래처에게 견적서 발송 이메일
  try {
    const dealer = await getDealerEmailForRfq(rfqId)
    if (dealer) {
      await sendEmail({
        templateKey: 'dealer_quote_sent',
        to: dealer.email,
        recipientType: 'dealer',
        recipientName: dealer.name,
        subject: `[iPC Mall] 견적서가 ${isRevise ? '재발송' : '도착'}했습니다 - ${rfq.rfq_no}`,
        react: QuoteSentToDealerEmail({
          dealerName: dealer.dealerName,
          contactName: dealer.name,
          rfqNo: rfq.rfq_no,
          title: rfq.title ?? '',
          totalAmount: formatKRW(d.totalAmount),
          leadTimeDays: d.leadTimeDays,
          validUntil: formatDate(d.validUntil),
          isRevise,
          quoteUrl: `${getSiteUrl()}/dealer/quotes/${rfqId}`,
        }),
        relatedDealerId: dealer.dealerId,
      })
    }
  } catch { /* 이메일 실패가 비즈니스 로직 차단 안 함 */ }

  return { quoteId }
}

// ============================================================
// 관리자 내부 메모
// ============================================================

export async function saveRfqInternalNote(rfqId: string, note: string) {
  const admin = await requireAdmin()

  await logRfqEvent({
    rfqId,
    eventType: 'admin_memo',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    message: note.trim() || '(메모 삭제)',
    isVisibleToDealer: false,
  })

  revalidateQuotePaths(rfqId)
}
