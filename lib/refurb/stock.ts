/**
 * 리퍼 부품 재고 예약/복원 헬퍼
 *
 * 발주 흐름에서 리퍼 부품의 실재고를 원자적으로 예약(차감)하고,
 * 발주 취소/반려 시 복원한다. 재고 갱신은 SECURITY DEFINER 함수를 통해
 * RLS와 무관하게 수행되며, 서버 액션에서만 호출한다.
 */
import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** 재고 원자적 예약(차감). 충분하면 true, 부족하면 false. */
export async function reserveRefurbStock(admin: AdminClient, partId: string, qty: number): Promise<boolean> {
  const { data, error } = await admin.rpc('reserve_refurb_stock', { p_part_id: partId, p_qty: qty })
  return !error && data === true
}

/** 재고 복원(가산). */
export async function restoreRefurbStock(admin: AdminClient, partId: string, qty: number): Promise<void> {
  await admin.rpc('restore_refurb_stock', { p_part_id: partId, p_qty: qty })
}

/**
 * 특정 발주에 포함된 모든 리퍼 부품의 재고를 복원한다.
 * 발주 취소/반려 시 호출 (표준 PC 항목은 재고 차감이 없으므로 무시).
 */
export async function restoreRefurbStockForOrder(orderId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: items } = await admin
    .from('order_items')
    .select('refurb_part_id, quantity')
    .eq('order_id', orderId)
    .eq('item_type', 'refurb_part')

  for (const it of items ?? []) {
    if (it.refurb_part_id) {
      await restoreRefurbStock(admin, it.refurb_part_id as string, it.quantity as number)
    }
  }
}
