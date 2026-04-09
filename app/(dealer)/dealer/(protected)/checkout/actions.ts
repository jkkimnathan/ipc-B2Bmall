'use server'

/**
 * 발주 제출 서버 액션
 */
import { revalidatePath } from 'next/cache'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { logOrderEvent } from '@/lib/orders/events'
import { formatKRW, formatDateTime } from '@/lib/utils/format'
import { sendEmail } from '@/lib/email/send'
import { getAdminNotificationEmails } from '@/lib/email/settings'
import { getSiteUrl } from '@/lib/email/helpers'
import NewOrderToAdminEmail from '@/components/emails/NewOrderToAdminEmail'

/** 발주번호 생성: PO-YYYYMMDD-NNNN */
async function generateOrderNo(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  // 오늘 발주 수 카운트
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('submitted_at', startOfDay)

  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `PO-${dateStr}-${seq}`
}

export async function submitOrder(formData: FormData): Promise<{
  orderId: string
  orderNo: string
}> {
  const session = await requireDealer()
  const supabase = await createClient()

  const cartItemIds = (formData.get('cart_item_ids') as string)?.split(',').filter(Boolean)
  const addressId = formData.get('address_id') as string | null
  const desiredShipDate = formData.get('desired_ship_date') as string | null
  const dealerMemo = formData.get('dealer_memo') as string | null

  if (!cartItemIds?.length) throw new Error('발주 품목이 없습니다.')
  if (!addressId) throw new Error('배송지를 선택해주세요.')

  // 장바구니 항목 + PC 정보 조회
  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select('*, standard_pcs(*)')
    .eq('dealer_id', session.dealer.id)
    .in('id', cartItemIds)

  if (cartError || !cartItems?.length) throw new Error('장바구니 항목을 찾을 수 없습니다.')

  // 재고 확인
  for (const item of cartItems) {
    const pc = item.standard_pcs as { stock_status: string; name: string } | null
    if (pc?.stock_status === 'out_of_stock') {
      throw new Error(`${pc.name}이(가) 품절 상태입니다. 장바구니에서 제거 후 다시 시도해주세요.`)
    }
  }

  // 배송지 조회
  const { data: address } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('dealer_id', session.dealer.id)
    .single()

  if (!address) throw new Error('유효하지 않은 배송지입니다.')

  // 합계 계산
  const totalAmount = cartItems.reduce((sum, item) => {
    const pc = item.standard_pcs as { sale_price: number } | null
    return sum + (pc?.sale_price ?? 0) * (item.quantity as number)
  }, 0)

  // 발주번호 생성
  const orderNo = await generateOrderNo(supabase)

  // 발주서 INSERT
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_no: orderNo,
      dealer_id: session.dealer.id,
      dealer_user_id: session.dealerUser.id,
      status: 'submitted',
      total_amount: totalAmount,
      dealer_memo: dealerMemo?.trim() || null,
      submitted_at: new Date().toISOString(),
      shipping_address_id: addressId,
      shipping_label: address.label,
      shipping_recipient: address.recipient_name,
      shipping_phone: address.phone,
      shipping_postal_code: address.postal_code,
      shipping_address: address.address,
      shipping_address_detail: address.address_detail,
      shipping_memo: address.memo,
      desired_ship_date: desiredShipDate || null,
    })
    .select('id')
    .single()

  if (orderError || !order) throw new Error('발주서 생성 실패: ' + (orderError?.message ?? ''))

  // 발주 항목 INSERT (스냅샷)
  const orderItems = cartItems.map((item) => {
    const pc = item.standard_pcs as { id: string; name: string; sale_price: number } | null
    const qty = item.quantity as number
    return {
      order_id: order.id,
      standard_pc_id: pc?.id ?? null,
      pc_name_snapshot: pc?.name ?? '알 수 없음',
      unit_price_snapshot: pc?.sale_price ?? 0,
      quantity: qty,
      subtotal: (pc?.sale_price ?? 0) * qty,
    }
  })

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) throw new Error('발주 항목 저장 실패: ' + itemsError.message)

  // 발주 이벤트 기록
  await logOrderEvent({
    orderId: order.id,
    eventType: 'submitted',
    actorType: 'dealer',
    actorId: session.dealerUser.id,
    actorName: session.dealerUser.name,
    fromStatus: null,
    toStatus: 'submitted',
    message: `${orderItems.length}종 총 ${formatKRW(totalAmount)} 발주 제출`,
    isVisibleToDealer: true,
  })

  // 장바구니에서 해당 항목 삭제
  await supabase
    .from('cart_items')
    .delete()
    .eq('dealer_id', session.dealer.id)
    .in('id', cartItemIds)

  revalidatePath('/dealer/orders')
  revalidatePath('/dealer/cart')
  revalidatePath('/dealer')

  // 관리자에게 새 발주 알림 이메일
  try {
    const adminEmails = await getAdminNotificationEmails()
    if (adminEmails.length > 0) {
      const { data: dealer } = await supabase
        .from('dealers')
        .select('company_name')
        .eq('id', session.dealer.id)
        .single()

      await sendEmail({
        templateKey: 'admin_new_order',
        to: adminEmails,
        recipientType: 'admin',
        subject: `[iPC Mall] 새 발주 접수 - ${orderNo}`,
        react: NewOrderToAdminEmail({
          orderNo,
          dealerName: dealer?.company_name ?? '',
          contactName: session.dealerUser.name,
          itemCount: orderItems.length,
          totalAmount: formatKRW(totalAmount),
          submittedAt: formatDateTime(new Date().toISOString()),
          adminUrl: `${getSiteUrl()}/admin/orders/${order.id}`,
        }),
        relatedOrderId: order.id,
      })
    }
  } catch { /* 이메일 실패가 비즈니스 로직 차단 안 함 */ }

  return { orderId: order.id, orderNo }
}
