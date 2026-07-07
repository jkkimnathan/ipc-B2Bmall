/**
 * 리퍼 부품 재고 예약/복원 헬퍼
 *
 * 발주 흐름에서 리퍼 부품의 실재고를 원자적으로 예약(차감)하고,
 * 발주 취소/반려 시 복원한다. 재고 갱신은 SECURITY DEFINER 함수를 통해
 * RLS와 무관하게 수행되며, service_role 서버 액션에서만 호출한다.
 */
import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** 재고 예약 결과 — 인프라 오류와 재고 부족을 구분한다. */
export type ReserveResult =
  | { ok: true }
  | { ok: false; reason: 'insufficient' | 'error'; message?: string }

/**
 * 재고 원자적 예약(차감).
 * 충분하면 { ok: true }, 부족하면 reason:'insufficient',
 * RPC/네트워크 오류면 reason:'error' 를 반환한다(호출부에서 구분 처리).
 */
export async function reserveRefurbStock(
  admin: AdminClient,
  partId: string,
  qty: number,
): Promise<ReserveResult> {
  const { data, error } = await admin.rpc('reserve_refurb_stock', { p_part_id: partId, p_qty: qty })
  if (error) {
    console.error('[reserveRefurbStock] RPC 오류:', error.message, { partId, qty })
    return { ok: false, reason: 'error', message: error.message }
  }
  if (data === true) return { ok: true }
  return { ok: false, reason: 'insufficient' }
}

/**
 * 재고 복원(가산). 실패 시 false 를 반환하고 로그를 남긴다.
 * 취소/반려 이후 호출되므로 실패가 조용히 삼켜지면 재고가 영구 손실될 수 있어
 * 반드시 오류를 확인·기록한다.
 */
export async function restoreRefurbStock(
  admin: AdminClient,
  partId: string,
  qty: number,
): Promise<boolean> {
  const { error } = await admin.rpc('restore_refurb_stock', { p_part_id: partId, p_qty: qty })
  if (error) {
    console.error('[restoreRefurbStock] 재고 복원 실패 — 수동 조정 필요:', error.message, { partId, qty })
    return false
  }
  return true
}

/**
 * 특정 발주에 포함된 모든 리퍼 부품의 재고를 복원한다.
 * 발주 취소/반려 시 호출 (표준 PC 항목은 재고 차감이 없으므로 무시).
 * 하나라도 실패하면 false 를 반환한다(호출부에서 로깅/알림 판단).
 */
export async function restoreRefurbStockForOrder(orderId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data: items, error } = await admin
    .from('order_items')
    .select('refurb_part_id, quantity')
    .eq('order_id', orderId)
    .eq('item_type', 'refurb_part')

  if (error) {
    console.error('[restoreRefurbStockForOrder] 항목 조회 실패 — 재고 복원 불가:', error.message, { orderId })
    return false
  }

  let allOk = true
  for (const it of items ?? []) {
    if (it.refurb_part_id) {
      const ok = await restoreRefurbStock(admin, it.refurb_part_id as string, it.quantity as number)
      if (!ok) allOk = false
    }
  }
  return allOk
}
