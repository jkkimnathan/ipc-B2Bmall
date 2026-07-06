'use server'

/**
 * 관리자 발주 처리 서버 액션
 *
 * 승인, 반려, 생산 시작, 출고 완료, 거래 완료, 취소,
 * 출고 예정일 변경, 내부 메모 등 모든 관리자 액션을 처리한다.
 */
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { logOrderEvent } from '@/lib/orders/events'
import { canTransitionTo, formatKRW, formatDateTime } from '@/lib/utils/format'
import { sendEmail } from '@/lib/email/send'
import { getDealerEmailForOrder, getSiteUrl } from '@/lib/email/helpers'
import { restoreRefurbStockForOrder } from '@/lib/refurb/stock'
import OrderApprovedToDealerEmail from '@/components/emails/OrderApprovedToDealerEmail'
import OrderRejectedToDealerEmail from '@/components/emails/OrderRejectedToDealerEmail'
import OrderShippedToDealerEmail from '@/components/emails/OrderShippedToDealerEmail'

// ============================================================
// 헬퍼
// ============================================================

/** 발주 조회 + 상태 전환 검증 */
async function getOrderAndValidate(orderId: string, nextStatus: string) {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error('발주를 찾을 수 없습니다.')

  if (!canTransitionTo(order.status, nextStatus)) {
    throw new Error(
      `현재 상태(${order.status})에서 ${nextStatus}(으)로 전환할 수 없습니다.`
    )
  }

  return { admin, supabase, order }
}

function revalidateOrderPaths(orderId: string) {
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/dealer/orders')
  revalidatePath(`/dealer/orders/${orderId}`)
  revalidatePath('/admin') // 대시보드 카운트 갱신
}

// ============================================================
// 승인: submitted → approved
// ============================================================

export async function approveOrder(orderId: string, shipDate: string, memo?: string) {
  const { admin, supabase, order } = await getOrderAndValidate(orderId, 'approved')

  if (!shipDate) throw new Error('출고 예정일을 입력해주세요.')

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'approved',
      expected_ship_date: shipDate,
      approved_at: new Date().toISOString(),
      admin_memo: memo?.trim() || order.admin_memo,
    })
    .eq('id', orderId)

  if (error) throw new Error('승인 실패: ' + error.message)

  await logOrderEvent({
    orderId,
    eventType: 'approved',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    fromStatus: order.status,
    toStatus: 'approved',
    message: `승인 완료. 출고 예정일 ${shipDate}${memo ? ` — ${memo}` : ''}`,
    isVisibleToDealer: true,
  })

  revalidateOrderPaths(orderId)

  // 거래처에게 승인 알림 이메일
  try {
    const dealer = await getDealerEmailForOrder(orderId)
    if (dealer) {
      await sendEmail({
        templateKey: 'dealer_order_approved',
        to: dealer.email,
        recipientType: 'dealer',
        recipientName: dealer.name,
        subject: `[iPC Mall] 발주가 승인되었습니다 - ${order.order_no}`,
        react: OrderApprovedToDealerEmail({
          dealerName: dealer.dealerName,
          contactName: dealer.name,
          orderNo: order.order_no,
          totalAmount: formatKRW(order.total_amount),
          expectedShipDate: shipDate,
          adminMemo: memo?.trim() || undefined,
          orderUrl: `${getSiteUrl()}/dealer/orders/${orderId}`,
        }),
        relatedOrderId: orderId,
        relatedDealerId: dealer.dealerId,
      })
    }
  } catch { /* 이메일 실패가 비즈니스 로직 차단 안 함 */ }
}

// ============================================================
// 반려: submitted → rejected
// ============================================================

export async function rejectOrder(orderId: string, reason: string) {
  const { admin, supabase, order } = await getOrderAndValidate(orderId, 'rejected')

  if (!reason?.trim()) throw new Error('반려 사유를 입력해주세요.')

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'rejected',
      admin_memo: reason.trim(),
    })
    .eq('id', orderId)

  if (error) throw new Error('반려 실패: ' + error.message)

  // 리퍼 부품 재고 복원
  await restoreRefurbStockForOrder(orderId)

  await logOrderEvent({
    orderId,
    eventType: 'rejected',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    fromStatus: order.status,
    toStatus: 'rejected',
    message: `반려 사유: ${reason.trim()}`,
    isVisibleToDealer: true,
  })

  revalidateOrderPaths(orderId)

  try {
    const dealer = await getDealerEmailForOrder(orderId)
    if (dealer) {
      await sendEmail({
        templateKey: 'dealer_order_rejected',
        to: dealer.email,
        recipientType: 'dealer',
        recipientName: dealer.name,
        subject: `[iPC Mall] 발주가 반려되었습니다 - ${order.order_no}`,
        react: OrderRejectedToDealerEmail({
          dealerName: dealer.dealerName,
          contactName: dealer.name,
          orderNo: order.order_no,
          reason: reason.trim(),
          orderUrl: `${getSiteUrl()}/dealer/orders/${orderId}`,
        }),
        relatedOrderId: orderId,
        relatedDealerId: dealer.dealerId,
      })
    }
  } catch { /* 이메일 실패가 비즈니스 로직 차단 안 함 */ }
}

// ============================================================
// 생산 시작: approved → in_production
// ============================================================

export async function startProduction(orderId: string) {
  const { admin, supabase, order } = await getOrderAndValidate(orderId, 'in_production')

  const { error } = await supabase
    .from('orders')
    .update({ status: 'in_production' })
    .eq('id', orderId)

  if (error) throw new Error('상태 변경 실패: ' + error.message)

  await logOrderEvent({
    orderId,
    eventType: 'in_production',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    fromStatus: order.status,
    toStatus: 'in_production',
    message: '생산을 시작합니다.',
    isVisibleToDealer: true,
  })

  revalidateOrderPaths(orderId)
}

// ============================================================
// 출고 완료: in_production → shipped
// ============================================================

export async function markShipped(orderId: string, memo?: string) {
  const { admin, supabase, order } = await getOrderAndValidate(orderId, 'shipped')

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'shipped',
      shipped_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) throw new Error('상태 변경 실패: ' + error.message)

  await logOrderEvent({
    orderId,
    eventType: 'shipped',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    fromStatus: order.status,
    toStatus: 'shipped',
    message: memo?.trim() || '출고가 완료되었습니다.',
    isVisibleToDealer: true,
  })

  revalidateOrderPaths(orderId)

  try {
    const dealer = await getDealerEmailForOrder(orderId)
    if (dealer) {
      await sendEmail({
        templateKey: 'dealer_order_shipped',
        to: dealer.email,
        recipientType: 'dealer',
        recipientName: dealer.name,
        subject: `[iPC Mall] 출고가 완료되었습니다 - ${order.order_no}`,
        react: OrderShippedToDealerEmail({
          dealerName: dealer.dealerName,
          contactName: dealer.name,
          orderNo: order.order_no,
          shippedAt: formatDateTime(new Date().toISOString()),
          orderUrl: `${getSiteUrl()}/dealer/orders/${orderId}`,
        }),
        relatedOrderId: orderId,
        relatedDealerId: dealer.dealerId,
      })
    }
  } catch { /* 이메일 실패가 비즈니스 로직 차단 안 함 */ }
}

// ============================================================
// 거래 완료: shipped → completed
// ============================================================

export async function completeOrder(orderId: string) {
  const { admin, supabase, order } = await getOrderAndValidate(orderId, 'completed')

  const { error } = await supabase
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', orderId)

  if (error) throw new Error('상태 변경 실패: ' + error.message)

  await logOrderEvent({
    orderId,
    eventType: 'completed',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    fromStatus: order.status,
    toStatus: 'completed',
    message: '거래가 완료되었습니다.',
    isVisibleToDealer: true,
  })

  revalidateOrderPaths(orderId)
}

// ============================================================
// 관리자 취소: submitted/approved/in_production → canceled
// ============================================================

export async function adminCancelOrder(orderId: string, reason: string) {
  const { admin, supabase, order } = await getOrderAndValidate(orderId, 'canceled')

  if (!reason?.trim()) throw new Error('취소 사유를 입력해주세요.')

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'canceled',
      admin_memo: reason.trim(),
    })
    .eq('id', orderId)

  if (error) throw new Error('취소 실패: ' + error.message)

  // 리퍼 부품 재고 복원
  await restoreRefurbStockForOrder(orderId)

  await logOrderEvent({
    orderId,
    eventType: 'admin_canceled',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    fromStatus: order.status,
    toStatus: 'canceled',
    message: `관리자 취소: ${reason.trim()}`,
    isVisibleToDealer: true,
  })

  revalidateOrderPaths(orderId)
}

// ============================================================
// 출고 예정일 변경
// ============================================================

export async function setExpectedShipDate(orderId: string, date: string) {
  const admin = await requireAdmin()
  const supabase = await createClient()

  if (!date) throw new Error('출고 예정일을 입력해주세요.')

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('status, expected_ship_date')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) throw new Error('발주를 찾을 수 없습니다.')

  // 완료/취소/반려 상태에서는 변경 불가
  if (['completed', 'canceled', 'rejected'].includes(order.status)) {
    throw new Error('종료된 발주의 출고 예정일은 변경할 수 없습니다.')
  }

  const oldDate = order.expected_ship_date

  const { error } = await supabase
    .from('orders')
    .update({ expected_ship_date: date })
    .eq('id', orderId)

  if (error) throw new Error('저장 실패: ' + error.message)

  await logOrderEvent({
    orderId,
    eventType: 'ship_date_set',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    message: oldDate
      ? `출고 예정일 변경: ${oldDate} → ${date}`
      : `출고 예정일 지정: ${date}`,
    metadata: { old_date: oldDate, new_date: date },
    isVisibleToDealer: true,
  })

  revalidateOrderPaths(orderId)
}

// ============================================================
// 내부 메모 저장 (거래처에 비공개)
// ============================================================

export async function saveAdminMemo(orderId: string, memo: string) {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) throw new Error('발주를 찾을 수 없습니다.')

  const { error } = await supabase
    .from('orders')
    .update({ admin_memo: memo.trim() || null })
    .eq('id', orderId)

  if (error) throw new Error('메모 저장 실패: ' + error.message)

  await logOrderEvent({
    orderId,
    eventType: 'admin_memo',
    actorType: 'admin',
    actorId: admin.id,
    actorName: admin.email ?? '관리자',
    message: memo.trim() || '(메모 삭제)',
    isVisibleToDealer: false, // 내부 메모는 거래처에 비공개
  })

  revalidateOrderPaths(orderId)
}
