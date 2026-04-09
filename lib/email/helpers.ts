/**
 * 이메일 발송을 위한 거래처/발주 정보 조회 헬퍼
 * 서버 사이드 전용
 */
import { createClient } from '@/lib/supabase/server'

/** 발주서의 거래처 담당자 이메일 조회 */
export async function getDealerEmailForOrder(orderId: string): Promise<{
  email: string
  name: string
  dealerName: string
  dealerId: string
} | null> {
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('dealer_id, dealer_user_id, dealers(company_name)')
    .eq('id', orderId)
    .single()

  if (!order) return null

  const dealers = order.dealers as unknown as { company_name: string } | null
  const dealerName = dealers?.company_name ?? ''

  // dealer_user_id가 있으면 해당 사용자 이메일
  if (order.dealer_user_id) {
    const { data: user } = await supabase
      .from('dealer_users')
      .select('email, name')
      .eq('id', order.dealer_user_id)
      .single()
    if (user?.email) {
      return { email: user.email, name: user.name, dealerName, dealerId: order.dealer_id }
    }
  }

  // 대표 담당자 이메일
  const { data: primary } = await supabase
    .from('dealer_users')
    .select('email, name')
    .eq('dealer_id', order.dealer_id)
    .eq('is_primary', true)
    .single()

  if (primary?.email) {
    return { email: primary.email, name: primary.name, dealerName, dealerId: order.dealer_id }
  }

  return null
}

/** RFQ의 거래처 담당자 이메일 조회 */
export async function getDealerEmailForRfq(rfqId: string): Promise<{
  email: string
  name: string
  dealerName: string
  dealerId: string
} | null> {
  const supabase = await createClient()

  const { data: rfq } = await supabase
    .from('quote_requests')
    .select('dealer_id, dealer_user_id, dealers(company_name)')
    .eq('id', rfqId)
    .single()

  if (!rfq) return null

  const dealers = rfq.dealers as unknown as { company_name: string } | null
  const dealerName = dealers?.company_name ?? ''

  if (rfq.dealer_user_id) {
    const { data: user } = await supabase
      .from('dealer_users')
      .select('email, name')
      .eq('id', rfq.dealer_user_id)
      .single()
    if (user?.email) {
      return { email: user.email, name: user.name, dealerName, dealerId: rfq.dealer_id }
    }
  }

  const { data: primary } = await supabase
    .from('dealer_users')
    .select('email, name')
    .eq('dealer_id', rfq.dealer_id)
    .eq('is_primary', true)
    .single()

  if (primary?.email) {
    return { email: primary.email, name: primary.name, dealerName, dealerId: rfq.dealer_id }
  }

  return null
}

/** 사이트 기본 URL */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}
