'use server'

/**
 * 거래처 견적 요청(RFQ) 서버 액션
 */
import { revalidatePath } from 'next/cache'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canEditRfq, generateRfqNo, formatDateTime, purposeLabel, toSafeInt } from '@/lib/utils/format'
import { generateOrderNo } from '@/lib/orders/orderNo'
import { logRfqEvent } from '@/lib/rfq/events'
import { logOrderEvent } from '@/lib/orders/events'
import { isQuoteExpired } from '@/lib/rfq/expiry'
import { sendEmail } from '@/lib/email/send'
import { getAdminNotificationEmails } from '@/lib/email/settings'
import { getSiteUrl } from '@/lib/email/helpers'
import NewRfqToAdminEmail from '@/components/emails/NewRfqToAdminEmail'

/** 새 견적 요청 제출 */
export async function requestQuote(formData: FormData): Promise<{
  rfqId: string
  rfqNo: string
}> {
  const session = await requireDealer()
  const supabase = await createClient()

  const title = formData.get('title') as string
  const purpose = formData.get('purpose') as string
  const quantity = toSafeInt(formData.get('quantity'), { min: 1, max: 100000 })
  const budgetPerUnitRaw = (formData.get('budget_per_unit') as string | null)?.trim() || ''
  const desiredShipDate = formData.get('desired_ship_date') as string | null
  const requirements = formData.get('requirements') as string | null
  const specJsonStr = formData.get('spec_json') as string
  const addressId = formData.get('address_id') as string
  const attachmentUrlsStr = formData.get('attachment_urls') as string | null

  // 유효성 검증
  if (!title?.trim()) throw new Error('제목을 입력해주세요.')
  if (!purpose) throw new Error('용도를 선택해주세요.')
  if (quantity === null) throw new Error('수량을 1 이상 입력해주세요.')
  if (!addressId) throw new Error('배송지를 선택해주세요.')

  const budgetPerUnit = budgetPerUnitRaw ? toSafeInt(budgetPerUnitRaw, { min: 0 }) : null
  if (budgetPerUnitRaw && budgetPerUnit === null) throw new Error('예산 금액이 올바르지 않습니다.')

  // spec_json 파싱 + 최소 1개 슬롯 입력 확인
  let specJson: Record<string, { name?: string; qty?: number } | { name: string }[] | undefined>
  try {
    specJson = JSON.parse(specJsonStr || '{}')
  } catch {
    throw new Error('사양 정보 형식이 올바르지 않습니다.')
  }
  const fixedKeys = ['cpu', 'mb', 'gpu', 'cooler', 'ram', 'ssd', 'hdd', 'case', 'psu', 'os', 'as']
  const spec = specJson as Record<string, { name?: string; qty?: number }> & { etc?: { name: string }[] }
  const hasSpec = fixedKeys.some((k) => spec[k]?.name && (spec[k]?.qty ?? 0) > 0) ||
    ((spec.etc?.length ?? 0) > 0 && (spec.etc ?? []).some((e) => e.name))
  if (!hasSpec) throw new Error('구성 요구사항에서 최소 1개 항목을 입력해주세요.')

  // 배송지 조회
  const { data: address } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('dealer_id', session.dealer.id)
    .single()

  if (!address) throw new Error('유효하지 않은 배송지입니다.')

  // 첨부파일 경로 배열 (본인 거래처 폴더 경로만 허용)
  const attachmentUrls = parseAttachmentPaths(attachmentUrlsStr, session.dealer.id)

  const rfqNo = generateRfqNo()
  const admin = createAdminClient()

  const { data: rfq, error } = await admin
    .from('quote_requests')
    .insert({
      rfq_no: rfqNo,
      dealer_id: session.dealer.id,
      dealer_user_id: session.dealerUser.id,
      title: title.trim(),
      purpose,
      quantity,
      budget_per_unit: budgetPerUnit,
      desired_ship_date: desiredShipDate || null,
      requirements: requirements?.trim() || '',
      spec_json: specJson,
      attachment_urls: attachmentUrls,
      shipping_address_id: addressId,
      shipping_label: address.label,
      shipping_recipient: address.recipient_name,
      shipping_phone: address.phone,
      shipping_postal_code: address.postal_code,
      shipping_address: address.address,
      shipping_address_detail: address.address_detail,
      shipping_memo: address.memo,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !rfq) throw new Error('견적 요청 실패: ' + (error?.message ?? ''))

  await logRfqEvent({
    rfqId: rfq.id,
    eventType: 'submitted',
    actorType: 'dealer',
    actorId: session.dealerUser.id,
    actorName: session.dealerUser.name,
    toStatus: 'submitted',
    message: `${title.trim()} / 수량 ${quantity}대 견적 요청`,
    isVisibleToDealer: true,
  })

  revalidatePath('/dealer/quotes')
  revalidatePath('/dealer')

  // 관리자에게 새 견적 요청 알림 이메일
  try {
    const adminEmails = await getAdminNotificationEmails()
    if (adminEmails.length > 0) {
      const { data: dealer } = await supabase
        .from('dealers')
        .select('company_name')
        .eq('id', session.dealer.id)
        .single()

      await sendEmail({
        templateKey: 'admin_new_rfq',
        to: adminEmails,
        recipientType: 'admin',
        subject: `[iPC Mall] 새 견적 요청 접수 - ${rfqNo}`,
        react: NewRfqToAdminEmail({
          rfqNo,
          dealerName: dealer?.company_name ?? '',
          contactName: session.dealerUser.name,
          title: title.trim(),
          quantity,
          purpose: purpose ? purposeLabel(purpose) : '—',
          submittedAt: formatDateTime(new Date().toISOString()),
          adminUrl: `${getSiteUrl()}/admin/quotes/${rfq.id}`,
        }),
        relatedRfqId: rfq.id,
      })
    }
  } catch { /* 이메일 실패가 비즈니스 로직 차단 안 함 */ }

  return { rfqId: rfq.id, rfqNo }
}

/** 견적 요청 수정 (submitted 상태일 때만) */
export async function updateQuoteRequest(rfqId: string, formData: FormData) {
  const session = await requireDealer()
  const supabase = await createClient()

  // 기존 RFQ 조회 + 권한/상태 확인
  const { data: rfq } = await supabase
    .from('quote_requests')
    .select('dealer_id, status, attachment_urls')
    .eq('id', rfqId)
    .single()

  if (!rfq || rfq.dealer_id !== session.dealer.id) throw new Error('권한이 없습니다.')
  if (!canEditRfq(rfq)) throw new Error('수정할 수 없는 상태입니다.')

  const title = formData.get('title') as string
  const purpose = formData.get('purpose') as string
  const quantity = toSafeInt(formData.get('quantity'), { min: 1, max: 100000 })
  const budgetPerUnitRaw = (formData.get('budget_per_unit') as string | null)?.trim() || ''
  const desiredShipDate = formData.get('desired_ship_date') as string | null
  const requirements = formData.get('requirements') as string | null
  const specJsonStr = formData.get('spec_json') as string
  const addressId = formData.get('address_id') as string
  const attachmentUrlsStr = formData.get('attachment_urls') as string | null

  if (!title?.trim()) throw new Error('제목을 입력해주세요.')
  if (!purpose) throw new Error('용도를 선택해주세요.')
  if (quantity === null) throw new Error('수량을 1 이상 입력해주세요.')
  if (!addressId) throw new Error('배송지를 선택해주세요.')

  const budgetPerUnit = budgetPerUnitRaw ? toSafeInt(budgetPerUnitRaw, { min: 0 }) : null
  if (budgetPerUnitRaw && budgetPerUnit === null) throw new Error('예산 금액이 올바르지 않습니다.')

  let specJson: unknown
  try {
    specJson = JSON.parse(specJsonStr || '{}')
  } catch {
    throw new Error('사양 정보 형식이 올바르지 않습니다.')
  }

  // 배송지 조회
  const { data: address } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('dealer_id', session.dealer.id)
    .single()

  if (!address) throw new Error('유효하지 않은 배송지입니다.')

  const newAttachmentUrls = parseAttachmentPaths(attachmentUrlsStr, session.dealer.id)
  const admin = createAdminClient()

  // 삭제된 첨부파일은 Storage에서도 제거 (service_role)
  const oldUrls = (rfq.attachment_urls as string[]) ?? []
  const removedUrls = oldUrls.filter((u) => !newAttachmentUrls.includes(u))
  for (const url of removedUrls) {
    const path = extractStoragePath(url)
    if (path) {
      await admin.storage.from('rfq-attachments').remove([path])
    }
  }

  const { error } = await admin
    .from('quote_requests')
    .update({
      title: title.trim(),
      purpose,
      quantity,
      budget_per_unit: budgetPerUnit,
      desired_ship_date: desiredShipDate || null,
      requirements: requirements?.trim() || '',
      spec_json: specJson,
      attachment_urls: newAttachmentUrls,
      shipping_address_id: addressId,
      shipping_label: address.label,
      shipping_recipient: address.recipient_name,
      shipping_phone: address.phone,
      shipping_postal_code: address.postal_code,
      shipping_address: address.address,
      shipping_address_detail: address.address_detail,
      shipping_memo: address.memo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rfqId)

  if (error) throw new Error('수정 실패: ' + error.message)

  await logRfqEvent({
    rfqId,
    eventType: 'dealer_updated',
    actorType: 'dealer',
    actorId: session.dealerUser.id,
    actorName: session.dealerUser.name,
    fromStatus: 'submitted',
    toStatus: 'submitted',
    message: '거래처에서 견적 요청 내용을 수정했습니다.',
    isVisibleToDealer: true,
  })

  revalidatePath('/dealer/quotes')
  revalidatePath(`/dealer/quotes/${rfqId}`)
}

/** 견적 요청 취소 (submitted 상태일 때만) */
export async function cancelQuoteRequest(rfqId: string) {
  const session = await requireDealer()
  const supabase = await createClient()

  const { data: rfq } = await supabase
    .from('quote_requests')
    .select('dealer_id, status')
    .eq('id', rfqId)
    .single()

  if (!rfq || rfq.dealer_id !== session.dealer.id) throw new Error('권한이 없습니다.')
  if (!canEditRfq(rfq)) throw new Error('취소할 수 없는 상태입니다.')

  // 조건부 전환(CAS): submitted 상태일 때만 취소 (service_role)
  const admin = createAdminClient()
  const { data: canceled, error } = await admin
    .from('quote_requests')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', rfqId)
    .eq('status', 'submitted')
    .select('id')

  if (error) throw new Error('취소 실패: ' + error.message)
  if (!canceled?.length) throw new Error('이미 처리된 견적 요청입니다.')

  await logRfqEvent({
    rfqId,
    eventType: 'dealer_canceled',
    actorType: 'dealer',
    actorId: session.dealerUser.id,
    actorName: session.dealerUser.name,
    fromStatus: 'submitted',
    toStatus: 'canceled',
    message: '거래처에서 견적 요청을 취소했습니다.',
    isVisibleToDealer: true,
  })

  revalidatePath('/dealer/quotes')
  revalidatePath(`/dealer/quotes/${rfqId}`)
}

/** 저장된 값(경로 또는 과거 전체 URL)에서 rfq-attachments 버킷 내부 경로 추출 */
function extractStoragePath(value: string): string | null {
  const marker = '/rfq-attachments/'
  const idx = value.indexOf(marker)
  if (idx !== -1) return value.slice(idx + marker.length)
  // 전체 URL 이 아니면 이미 경로로 간주
  return value || null
}

/**
 * 클라이언트가 보낸 첨부 목록(JSON)을 파싱해 "본인 거래처 폴더" 경로만 허용한다.
 * 과거 데이터 호환을 위해 전체 URL 도 경로로 정규화한 뒤 접두어를 검증한다.
 * 형식/소유권이 어긋나면 예외를 던진다.
 */
function parseAttachmentPaths(raw: string | null | undefined, dealerId: string): string[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('첨부파일 정보 형식이 올바르지 않습니다.')
  }
  if (!Array.isArray(parsed)) throw new Error('첨부파일 정보 형식이 올바르지 않습니다.')

  const prefix = `${dealerId}/`
  return parsed.map((entry) => {
    if (typeof entry !== 'string') throw new Error('첨부파일 경로가 올바르지 않습니다.')
    const path = extractStoragePath(entry) ?? ''
    if (!path.startsWith(prefix)) {
      throw new Error('본인 거래처의 첨부파일만 등록할 수 있습니다.')
    }
    return path
  })
}

// ============================================================
// 견적 수락 → 발주서 자동 생성
// ============================================================

export async function acceptQuote(rfqId: string): Promise<{
  orderId: string
  orderNo: string
}> {
  const session = await requireDealer()
  const supabase = await createClient()

  // RFQ 조회 + 권한 확인
  const { data: rfq } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('id', rfqId)
    .single()

  if (!rfq || rfq.dealer_id !== session.dealer.id) throw new Error('권한이 없습니다.')
  if (rfq.status !== 'quoted') throw new Error('수락할 수 없는 상태입니다.')

  const admin = createAdminClient()

  // 견적서 조회
  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('rfq_id', rfqId)
    .eq('status', 'sent')
    .single()

  if (!quote) throw new Error('발송된 견적서를 찾을 수 없습니다.')

  // 유효기한 검증
  if (isQuoteExpired(quote.valid_until)) {
    // 만료 처리 (service_role)
    await admin.from('quotes').update({ status: 'expired' }).eq('id', quote.id).eq('status', 'sent')
    await admin.from('quote_requests').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', rfqId).eq('status', 'quoted')
    await logRfqEvent({
      rfqId, quoteId: quote.id,
      eventType: 'expired', actorType: 'system', actorName: '시스템',
      fromStatus: 'quoted', toStatus: 'expired',
      message: '견적서 유효기한이 만료되었습니다.',
      isVisibleToDealer: true,
    })
    throw new Error('견적서 유효기한이 만료되었습니다. 새 견적 요청을 제출해주세요.')
  }

  // 0) 조건부 전환(CAS)으로 견적서를 선점한다. sent 상태일 때만 accepted 로 전환되며,
  //    동시/중복 수락 요청 중 한 건만 통과하여 주문이 두 번 생성되는 것을 막는다.
  const { data: claimed, error: claimError } = await admin
    .from('quotes')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', quote.id)
    .eq('status', 'sent')
    .select('id')

  if (claimError) throw new Error('견적 수락 처리 실패: ' + claimError.message)
  if (!claimed?.length) throw new Error('이미 처리되었거나 수락할 수 없는 견적입니다.')

  // 선점 이후 실패 시 견적서를 sent 로 되돌리는 보상 함수
  const revertClaim = async () => {
    await admin.from('quotes').update({ status: 'sent', responded_at: null }).eq('id', quote.id)
  }

  // 1) 발주서 생성 (전역 원자적 채번, service_role)
  const orderNo = await generateOrderNo(admin).catch(async (e) => {
    await revertClaim()
    throw e
  })

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      order_no: orderNo,
      dealer_id: session.dealer.id,
      dealer_user_id: session.dealerUser.id,
      status: 'submitted',
      total_amount: quote.total_amount,
      dealer_memo: `견적 ${quote.quote_no} 수락으로 자동 생성`,
      desired_ship_date: rfq.desired_ship_date,
      shipping_address_id: rfq.shipping_address_id,
      shipping_label: rfq.shipping_label,
      shipping_recipient: rfq.shipping_recipient,
      shipping_phone: rfq.shipping_phone,
      shipping_postal_code: rfq.shipping_postal_code,
      shipping_address: rfq.shipping_address,
      shipping_address_detail: rfq.shipping_address_detail,
      shipping_memo: rfq.shipping_memo,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (orderError || !order) {
    await revertClaim()
    throw new Error('발주서 생성 실패: ' + (orderError?.message ?? ''))
  }

  // 2) 발주 항목 생성 (실패 시 주문 삭제 + 견적서 원복)
  const { error: itemError } = await admin
    .from('order_items')
    .insert({
      order_id: order.id,
      standard_pc_id: null,
      pc_name_snapshot: rfq.title,
      unit_price_snapshot: quote.unit_price,
      quantity: quote.quantity,
      subtotal: quote.total_amount,
      source_type: 'quote',
      source_quote_id: quote.id,
    })

  if (itemError) {
    await admin.from('orders').delete().eq('id', order.id)
    await revertClaim()
    throw new Error('발주 항목 생성 실패: ' + itemError.message)
  }

  // 3) 견적서에 전환된 발주 연결 (상태는 이미 accepted)
  await admin
    .from('quotes')
    .update({ converted_order_id: order.id })
    .eq('id', quote.id)

  // 4) RFQ 상태 업데이트 (CAS)
  await admin
    .from('quote_requests')
    .update({ status: 'converted_to_order', updated_at: new Date().toISOString() })
    .eq('id', rfqId)
    .eq('status', 'quoted')

  // 5) 이벤트 로깅
  await logRfqEvent({
    rfqId, quoteId: quote.id,
    eventType: 'accepted',
    actorType: 'dealer',
    actorId: session.dealerUser.id,
    actorName: session.dealerUser.name,
    fromStatus: 'quoted', toStatus: 'accepted',
    message: `견적을 수락했습니다. 발주서 ${orderNo} 자동 생성.`,
    isVisibleToDealer: true,
  })

  await logRfqEvent({
    rfqId, quoteId: quote.id,
    eventType: 'converted_to_order',
    actorType: 'system',
    actorName: '시스템',
    fromStatus: 'accepted', toStatus: 'converted_to_order',
    message: `발주서 ${orderNo}로 전환되었습니다.`,
    metadata: { orderId: order.id, orderNo },
    isVisibleToDealer: true,
  })

  await logOrderEvent({
    orderId: order.id,
    eventType: 'submitted',
    actorType: 'dealer',
    actorId: session.dealerUser.id,
    actorName: session.dealerUser.name,
    toStatus: 'submitted',
    message: `견적 수락으로 자동 생성 (${rfq.rfq_no})`,
    metadata: { rfqId, quoteId: quote.id, quoteNo: quote.quote_no },
    isVisibleToDealer: true,
  })

  // 6) revalidate
  revalidatePath('/dealer/quotes')
  revalidatePath(`/dealer/quotes/${rfqId}`)
  revalidatePath('/dealer/orders')
  revalidatePath('/dealer')
  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${rfqId}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')

  return { orderId: order.id, orderNo }
}

// ============================================================
// 견적 거절
// ============================================================

export async function rejectQuote(rfqId: string, reason: string): Promise<void> {
  const session = await requireDealer()
  const supabase = await createClient()

  if (!reason.trim()) throw new Error('거절 사유를 입력해주세요.')

  const { data: rfq } = await supabase
    .from('quote_requests')
    .select('id, dealer_id, status')
    .eq('id', rfqId)
    .single()

  if (!rfq || rfq.dealer_id !== session.dealer.id) throw new Error('권한이 없습니다.')
  if (rfq.status !== 'quoted') throw new Error('거절할 수 없는 상태입니다.')

  const admin = createAdminClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('id')
    .eq('rfq_id', rfqId)
    .eq('status', 'sent')
    .single()

  if (!quote) throw new Error('발송된 견적서를 찾을 수 없습니다.')

  // 조건부 전환(CAS): sent 견적서를 rejected 로 전환 (service_role)
  const { data: rejected, error: rejectErr } = await admin
    .from('quotes')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', quote.id)
    .eq('status', 'sent')
    .select('id')

  if (rejectErr) throw new Error('거절 처리 실패: ' + rejectErr.message)
  if (!rejected?.length) throw new Error('이미 처리된 견적입니다.')

  // RFQ 상태 업데이트
  await admin
    .from('quote_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', rfqId)
    .eq('status', 'quoted')

  // 이벤트 로깅
  await logRfqEvent({
    rfqId, quoteId: quote.id,
    eventType: 'rejected_by_dealer',
    actorType: 'dealer',
    actorId: session.dealerUser.id,
    actorName: session.dealerUser.name,
    fromStatus: 'quoted', toStatus: 'rejected',
    message: reason.trim(),
    metadata: { reason: reason.trim() },
    isVisibleToDealer: true,
  })

  revalidatePath('/dealer/quotes')
  revalidatePath(`/dealer/quotes/${rfqId}`)
  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${rfqId}`)
}
