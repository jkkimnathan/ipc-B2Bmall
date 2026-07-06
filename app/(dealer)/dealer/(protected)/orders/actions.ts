'use server'

/**
 * 거래처 발주 수정/취소 서버 액션
 */
import { revalidatePath } from 'next/cache'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canEditOrder } from '@/lib/utils/format'
import { logOrderEvent } from '@/lib/orders/events'
import { reserveRefurbStock, restoreRefurbStock, restoreRefurbStockForOrder } from '@/lib/refurb/stock'

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

  // 리퍼 부품 재고 복원
  await restoreRefurbStockForOrder(orderId)

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

  // 클라이언트가 보낸 수정안 (id + quantity만 신뢰; 나머지 메타데이터는 DB에서 재조회)
  const incoming: { id: string; quantity: number }[] = JSON.parse(itemsJson)
  if (!incoming.length) throw new Error('최소 1개 품목이 필요합니다.')
  for (const it of incoming) {
    if (!Number.isInteger(it.quantity) || it.quantity < 1) throw new Error('수량은 1 이상이어야 합니다.')
  }

  // 기존 발주 항목(권위 있는 메타데이터) 조회
  const { data: existingItems } = await supabase
    .from('order_items')
    .select('id, item_type, standard_pc_id, refurb_part_id, quantity, pc_name_snapshot, unit_price_snapshot')
    .eq('order_id', orderId)

  const existingById = new Map((existingItems ?? []).map((i) => [i.id as string, i]))

  // 수정 후 최종 항목 구성 (기존 항목만 허용, 신규 추가 불가)
  const finalItems = incoming.map((inc) => {
    const ex = existingById.get(inc.id)
    if (!ex) throw new Error('유효하지 않은 발주 항목이 포함되어 있습니다.')
    return {
      order_id: orderId,
      item_type: ex.item_type as 'standard_pc' | 'refurb_part',
      standard_pc_id: ex.standard_pc_id as string | null,
      refurb_part_id: ex.refurb_part_id as string | null,
      pc_name_snapshot: ex.pc_name_snapshot as string,
      unit_price_snapshot: ex.unit_price_snapshot as number,
      quantity: inc.quantity,
      subtotal: (ex.unit_price_snapshot as number) * inc.quantity,
    }
  })

  const totalAmount = finalItems.reduce((sum, i) => sum + i.subtotal, 0)

  // ── 리퍼 부품 재고 재조정 (변경분만큼 예약/복원) ──
  const admin = createAdminClient()
  const finalQtyByPart = new Map<string, number>()
  for (const fi of finalItems) {
    if (fi.item_type === 'refurb_part' && fi.refurb_part_id) {
      finalQtyByPart.set(fi.refurb_part_id, (finalQtyByPart.get(fi.refurb_part_id) ?? 0) + fi.quantity)
    }
  }
  const oldQtyByPart = new Map<string, number>()
  for (const ex of existingItems ?? []) {
    if (ex.item_type === 'refurb_part' && ex.refurb_part_id) {
      const pid = ex.refurb_part_id as string
      oldQtyByPart.set(pid, (oldQtyByPart.get(pid) ?? 0) + (ex.quantity as number))
    }
  }
  const allPartIds = new Set<string>([...finalQtyByPart.keys(), ...oldQtyByPart.keys()])
  const appliedDeltas: { partId: string; delta: number }[] = []
  const rollbackDeltas = async () => {
    for (const a of appliedDeltas) {
      // 예약(음수 delta 차감)했던 것을 되돌림
      if (a.delta > 0) await restoreRefurbStock(admin, a.partId, a.delta)
      else await reserveRefurbStock(admin, a.partId, -a.delta)
    }
  }
  for (const pid of allPartIds) {
    const delta = (finalQtyByPart.get(pid) ?? 0) - (oldQtyByPart.get(pid) ?? 0)
    if (delta > 0) {
      const ok = await reserveRefurbStock(admin, pid, delta)
      if (!ok) {
        await rollbackDeltas()
        throw new Error('리퍼 부품의 재고가 부족하여 수량을 늘릴 수 없습니다.')
      }
      appliedDeltas.push({ partId: pid, delta })
    } else if (delta < 0) {
      await restoreRefurbStock(admin, pid, -delta)
      appliedDeltas.push({ partId: pid, delta })
    }
  }

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

  if (orderError) {
    await rollbackDeltas()
    throw new Error('수정 실패: ' + orderError.message)
  }

  // 기존 항목 삭제 후 재입력
  await supabase.from('order_items').delete().eq('order_id', orderId)

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(finalItems)

  if (itemsError) {
    await rollbackDeltas()
    throw new Error('항목 저장 실패: ' + itemsError.message)
  }

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
