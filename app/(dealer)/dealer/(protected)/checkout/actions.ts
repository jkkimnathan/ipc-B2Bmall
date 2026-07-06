'use server'

/**
 * 발주 제출 서버 액션
 */
import { revalidatePath } from 'next/cache'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logOrderEvent } from '@/lib/orders/events'
import { formatKRW, formatDateTime } from '@/lib/utils/format'
import { generateOrderNo } from '@/lib/orders/orderNo'
import { sendEmail } from '@/lib/email/send'
import { getAdminNotificationEmails } from '@/lib/email/settings'
import { getSiteUrl } from '@/lib/email/helpers'
import NewOrderToAdminEmail from '@/components/emails/NewOrderToAdminEmail'

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

  // 장바구니 항목 + PC/리퍼 부품 정보 조회
  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select('*, standard_pcs(*), refurb_parts(*)')
    .eq('dealer_id', session.dealer.id)
    .in('id', cartItemIds)

  if (cartError || !cartItems?.length) throw new Error('장바구니 항목을 찾을 수 없습니다.')

  // 항목 정규화 + 사전 재고 확인
  type NormalizedItem = {
    itemType: 'standard_pc' | 'refurb_part'
    refId: string | null
    name: string
    price: number
    quantity: number
  }
  const normalized: NormalizedItem[] = cartItems.map((item) => {
    const qty = item.quantity as number
    if (item.item_type === 'refurb_part') {
      const part = item.refurb_parts as {
        id: string; name: string; sale_price: number; stock_quantity: number; is_active: boolean
      } | null
      if (!part || !part.is_active) throw new Error('판매 중이 아닌 리퍼 부품이 포함되어 있습니다.')
      if (part.stock_quantity < qty) {
        throw new Error(`${part.name}의 재고가 부족합니다 (재고 ${part.stock_quantity}개). 장바구니 수량을 조정해주세요.`)
      }
      return { itemType: 'refurb_part', refId: part.id, name: part.name, price: part.sale_price, quantity: qty }
    }
    const pc = item.standard_pcs as { id: string; name: string; sale_price: number; stock_status: string } | null
    if (!pc) throw new Error('존재하지 않는 상품이 포함되어 있습니다.')
    if (pc.stock_status === 'out_of_stock') {
      throw new Error(`${pc.name}이(가) 품절 상태입니다. 장바구니에서 제거 후 다시 시도해주세요.`)
    }
    return { itemType: 'standard_pc', refId: pc.id, name: pc.name, price: pc.sale_price, quantity: qty }
  })

  // 배송지 조회
  const { data: address } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('dealer_id', session.dealer.id)
    .single()

  if (!address) throw new Error('유효하지 않은 배송지입니다.')

  // 합계 계산
  const totalAmount = normalized.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // ── 리퍼 부품 재고 원자적 예약 (동시성 안전) ──
  const admin = createAdminClient()
  const reserved: { partId: string; qty: number }[] = []
  const restoreReserved = async () => {
    for (const r of reserved) {
      await admin.rpc('restore_refurb_stock', { p_part_id: r.partId, p_qty: r.qty })
    }
  }
  for (const item of normalized) {
    if (item.itemType !== 'refurb_part' || !item.refId) continue
    const { data: ok, error: rpcError } = await admin.rpc('reserve_refurb_stock', {
      p_part_id: item.refId,
      p_qty: item.quantity,
    })
    if (rpcError || !ok) {
      await restoreReserved()
      throw new Error(`${item.name}의 재고가 부족합니다. 잠시 후 다시 시도해주세요.`)
    }
    reserved.push({ partId: item.refId, qty: item.quantity })
  }

  // 발주번호 생성 (전역 원자적 채번)
  const orderNo = await generateOrderNo(admin)

  // 발주서 INSERT (거래처 쓰기 정책 제거 — service_role 로 기록)
  const { data: order, error: orderError } = await admin
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

  if (orderError || !order) {
    await restoreReserved()
    throw new Error('발주서 생성 실패: ' + (orderError?.message ?? ''))
  }

  // 발주 항목 INSERT (스냅샷)
  const orderItems = normalized.map((item) => ({
    order_id: order.id,
    item_type: item.itemType,
    standard_pc_id: item.itemType === 'standard_pc' ? item.refId : null,
    refurb_part_id: item.itemType === 'refurb_part' ? item.refId : null,
    pc_name_snapshot: item.name,
    unit_price_snapshot: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
  }))

  const { error: itemsError } = await admin
    .from('order_items')
    .insert(orderItems)

  if (itemsError) {
    // 롤백: 주문 삭제 + 재고 복원 (삭제는 서비스 롤 클라이언트로 수행 — RLS상 거래처는 발주 삭제 불가)
    await admin.from('orders').delete().eq('id', order.id)
    await restoreReserved()
    throw new Error('발주 항목 저장 실패: ' + itemsError.message)
  }

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
