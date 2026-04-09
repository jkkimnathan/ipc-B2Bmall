'use server'

/**
 * 거래처 견적 요청(RFQ) 서버 액션
 */
import { revalidatePath } from 'next/cache'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { canEditRfq, generateRfqNo, formatDateTime, purposeLabel } from '@/lib/utils/format'
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
  const quantity = Number(formData.get('quantity'))
  const budgetPerUnit = formData.get('budget_per_unit') as string
  const desiredShipDate = formData.get('desired_ship_date') as string | null
  const requirements = formData.get('requirements') as string | null
  const specJsonStr = formData.get('spec_json') as string
  const addressId = formData.get('address_id') as string
  const attachmentUrlsStr = formData.get('attachment_urls') as string | null

  // 유효성 검증
  if (!title?.trim()) throw new Error('제목을 입력해주세요.')
  if (!purpose) throw new Error('용도를 선택해주세요.')
  if (!quantity || quantity < 1) throw new Error('수량을 1 이상 입력해주세요.')
  if (!addressId) throw new Error('배송지를 선택해주세요.')

  // spec_json 파싱 + 최소 1개 슬롯 입력 확인
  const specJson = JSON.parse(specJsonStr || '{}')
  const fixedKeys = ['cpu', 'mb', 'gpu', 'cooler', 'ram', 'ssd', 'hdd', 'case', 'psu', 'os', 'as']
  const hasSpec = fixedKeys.some((k) => specJson[k]?.name && specJson[k]?.qty > 0) ||
    (specJson.etc?.length > 0 && specJson.etc.some((e: { name: string }) => e.name))
  if (!hasSpec) throw new Error('구성 요구사항에서 최소 1개 항목을 입력해주세요.')

  // 배송지 조회
  const { data: address } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('dealer_id', session.dealer.id)
    .single()

  if (!address) throw new Error('유효하지 않은 배송지입니다.')

  // 첨부파일 URL 배열
  const attachmentUrls: string[] = attachmentUrlsStr
    ? JSON.parse(attachmentUrlsStr)
    : []

  const rfqNo = generateRfqNo()

  const { data: rfq, error } = await supabase
    .from('quote_requests')
    .insert({
      rfq_no: rfqNo,
      dealer_id: session.dealer.id,
      dealer_user_id: session.dealerUser.id,
      title: title.trim(),
      purpose,
      quantity,
      budget_per_unit: budgetPerUnit ? Number(budgetPerUnit) : null,
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
  const quantity = Number(formData.get('quantity'))
  const budgetPerUnit = formData.get('budget_per_unit') as string
  const desiredShipDate = formData.get('desired_ship_date') as string | null
  const requirements = formData.get('requirements') as string | null
  const specJsonStr = formData.get('spec_json') as string
  const addressId = formData.get('address_id') as string
  const attachmentUrlsStr = formData.get('attachment_urls') as string | null

  if (!title?.trim()) throw new Error('제목을 입력해주세요.')
  if (!purpose) throw new Error('용도를 선택해주세요.')
  if (!quantity || quantity < 1) throw new Error('수량을 1 이상 입력해주세요.')
  if (!addressId) throw new Error('배송지를 선택해주세요.')

  const specJson = JSON.parse(specJsonStr || '{}')

  // 배송지 조회
  const { data: address } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('dealer_id', session.dealer.id)
    .single()

  if (!address) throw new Error('유효하지 않은 배송지입니다.')

  const newAttachmentUrls: string[] = attachmentUrlsStr
    ? JSON.parse(attachmentUrlsStr)
    : []

  // 삭제된 첨부파일은 Storage에서도 제거
  const oldUrls = (rfq.attachment_urls as string[]) ?? []
  const removedUrls = oldUrls.filter((u) => !newAttachmentUrls.includes(u))
  for (const url of removedUrls) {
    // URL에서 버킷 내 경로 추출
    const path = extractStoragePath(url)
    if (path) {
      await supabase.storage.from('rfq-attachments').remove([path])
    }
  }

  const { error } = await supabase
    .from('quote_requests')
    .update({
      title: title.trim(),
      purpose,
      quantity,
      budget_per_unit: budgetPerUnit ? Number(budgetPerUnit) : null,
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

  const { error } = await supabase
    .from('quote_requests')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', rfqId)

  if (error) throw new Error('취소 실패: ' + error.message)

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

/** Storage URL에서 버킷 내부 경로 추출 */
function extractStoragePath(url: string): string | null {
  // /storage/v1/object/public/rfq-attachments/path/file.pdf
  const marker = '/rfq-attachments/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

// ============================================================
// 발주번호 생성 (checkout/actions.ts와 동일 패턴)
// ============================================================

async function generateOrderNo(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('submitted_at', startOfDay)
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `PO-${dateStr}-${seq}`
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
    // 만료 처리
    await supabase.from('quotes').update({ status: 'expired' }).eq('id', quote.id)
    await supabase.from('quote_requests').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', rfqId)
    await logRfqEvent({
      rfqId, quoteId: quote.id,
      eventType: 'expired', actorType: 'system', actorName: '시스템',
      fromStatus: 'quoted', toStatus: 'expired',
      message: '견적서 유효기한이 만료되었습니다.',
      isVisibleToDealer: true,
    })
    throw new Error('견적서 유효기한이 만료되었습니다. 새 견적 요청을 제출해주세요.')
  }

  // 1) 발주서 생성
  const orderNo = await generateOrderNo(supabase)

  const { data: order, error: orderError } = await supabase
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

  if (orderError || !order) throw new Error('발주서 생성 실패: ' + (orderError?.message ?? ''))

  // 2) 발주 항목 생성
  const { error: itemError } = await supabase
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

  if (itemError) throw new Error('발주 항목 생성 실패: ' + itemError.message)

  // 3) 견적서 상태 업데이트
  await supabase
    .from('quotes')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
      converted_order_id: order.id,
    })
    .eq('id', quote.id)

  // 4) RFQ 상태 업데이트
  await supabase
    .from('quote_requests')
    .update({ status: 'converted_to_order', updated_at: new Date().toISOString() })
    .eq('id', rfqId)

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

  const { data: quote } = await supabase
    .from('quotes')
    .select('id')
    .eq('rfq_id', rfqId)
    .eq('status', 'sent')
    .single()

  if (!quote) throw new Error('발송된 견적서를 찾을 수 없습니다.')

  // 견적서 상태 업데이트
  await supabase
    .from('quotes')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', quote.id)

  // RFQ 상태 업데이트
  await supabase
    .from('quote_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', rfqId)

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
