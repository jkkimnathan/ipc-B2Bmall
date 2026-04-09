'use server'

/**
 * 거래처 발주 수정/취소 서버 액션
 */
import { revalidatePath } from 'next/cache'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { canEditOrder } from '@/lib/utils/format'
import { logOrderEvent } from '@/lib/orders/events'

/** 발주 취소 */
export async function cancelOrder(orderId: string) {
  const session = await requireDealer()
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('dealer_id, status, submitted_at')
    .eq('id', orderId)
    .single()

  if (!order || order.dealer_id !== session.dealer.id) {
    throw new Error('권한이 없습니다.')
  }

  if (!canEditOrder(order)) {
    throw new Error('수정 가능 시간이 지났거나 이미 처리된 발주입니다.')
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'canceled' })
    .eq('id', orderId)

  if (error) throw new Error('취소 실패: ' + error.message)

  await logOrderEvent({
    orderId,
    eventType: 'dealer_canceled',
    actorType: 'dealer',
    actorId: session.dealerUser.id,
    actorName: session.dealerUser.name,
    fromStatus: 'submitted',
    toStatus: 'canceled',
    message: '거래처에서 발주를 취소했습니다.',
    isVisibleToDealer: true,
  })

  revalidatePath('/dealer/orders')
}

/** 발주 수정 (수량/배송지/메모 변경) */
export async function updateOrder(orderId: string, formData: FormData) {
  const session = await requireDealer()
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('dealer_id, status, submitted_at')
    .eq('id', orderId)
    .single()

  if (!order || order.dealer_id !== session.dealer.id) {
    throw new Error('권한이 없습니다.')
  }

  if (!canEditOrder(order)) {
    throw new Error('수정 가능 시간이 지났거나 이미 처리된 발주입니다.')
  }

  const addressId = formData.get('address_id') as string
  const desiredShipDate = formData.get('desired_ship_date') as string | null
  const dealerMemo = formData.get('dealer_memo') as string | null
  const itemsJson = formData.get('items') as string

  if (!addressId) throw new Error('배송지를 선택해주세요.')

  // 배송지 조회
  const { data: address } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('dealer_id', session.dealer.id)
    .single()

  if (!address) throw new Error('유효하지 않은 배송지입니다.')

  // 항목 파싱
  const items: { id: string; quantity: number; pcName: string; unitPrice: number; pcId: string | null }[] = JSON.parse(itemsJson)
  if (!items.length) throw new Error('최소 1개 품목이 필요합니다.')

  const totalAmount = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  // 발주서 업데이트
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      total_amount: totalAmount,
      dealer_memo: dealerMemo?.trim() || null,
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
    .eq('id', orderId)

  if (orderError) throw new Error('수정 실패: ' + orderError.message)

  // 기존 항목 삭제 후 재입력
  await supabase.from('order_items').delete().eq('order_id', orderId)

  const orderItems = items.map((i) => ({
    order_id: orderId,
    standard_pc_id: i.pcId,
    pc_name_snapshot: i.pcName,
    unit_price_snapshot: i.unitPrice,
    quantity: i.quantity,
    subtotal: i.unitPrice * i.quantity,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) throw new Error('항목 저장 실패: ' + itemsError.message)

  await logOrderEvent({
    orderId,
    eventType: 'dealer_updated',
    actorType: 'dealer',
    actorId: session.dealerUser.id,
    actorName: session.dealerUser.name,
    fromStatus: 'submitted',
    toStatus: 'submitted',
    message: '거래처에서 발주 내용을 수정했습니다.',
    metadata: {
      updated_fields: ['items', 'shipping_address', 'desired_ship_date', 'dealer_memo'],
    },
    isVisibleToDealer: true,
  })

  revalidatePath('/dealer/orders')
  revalidatePath(`/dealer/orders/${orderId}`)
}
