/**
 * 관리자 발주 상세 페이지
 *
 * 발주 품목, 배송 정보, 진행 관리(액션 패널),
 * 이력 타임라인을 통합 제공한다.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatKRW, formatDateTime, formatDate,
  formatRelativeTime, formatAddress, orderStatusLabel,
} from '@/lib/utils/format'
import OrderActionPanel from '@/components/admin/orders/OrderActionPanel'
import OrderTimeline from '@/components/admin/orders/OrderTimeline'
import type { Order, OrderItem, OrderEvent } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  await requireAdmin()
  const { id } = await params
  const supabase = await createClient()

  // 발주서 + 거래처 정보
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, dealers(id, company_name)')
    .eq('id', id)
    .single()

  if (error || !order) notFound()

  // 발주 항목
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('pc_name_snapshot')

  // 담당자 정보
  let dealerUserName = ''
  if (order.dealer_user_id) {
    const { data: dealerUser } = await supabase
      .from('dealer_users')
      .select('name, role')
      .eq('id', order.dealer_user_id)
      .single()
    if (dealerUser) {
      dealerUserName = `${dealerUser.name}${dealerUser.role ? ` ${dealerUser.role}` : ''}`
    }
  }

  // 이벤트 이력
  const { data: events } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  // 견적 기반 발주의 원본 견적 정보 조회
  const sourceQuoteIds = (items ?? [])
    .filter((item: OrderItem) => item.source_quote_id)
    .map((item: OrderItem) => item.source_quote_id!)
  let sourceQuoteMap: Record<string, { quote_no: string; rfq_id: string }> = {}
  if (sourceQuoteIds.length > 0) {
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, quote_no, rfq_id')
      .in('id', sourceQuoteIds)
    for (const q of quotes ?? []) {
      sourceQuoteMap[q.id] = { quote_no: q.quote_no, rfq_id: q.rfq_id }
    }
  }

  const st = orderStatusLabel(order.status)
  const dealer = order.dealers as { id: string; company_name: string } | null
  const companyName = dealer?.company_name ?? '—'

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* 뒤로가기 */}
      <Link
        href="/admin/orders"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit"
      >
        <ArrowLeft className="size-4" />
        목록으로
      </Link>

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{order.order_no}</h1>
            <Badge
              variant={
                order.status === 'rejected' || order.status === 'canceled'
                  ? 'destructive'
                  : order.status === 'completed'
                    ? 'outline'
                    : 'default'
              }
            >
              {st.label}
            </Badge>
            {(items ?? []).some((item: OrderItem) => item.source_type === 'quote') && (
              <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                견적 기반 발주
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-600 mt-1">
            {companyName}
            {dealerUserName && ` / ${dealerUserName}`}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            제출: {formatDateTime(order.submitted_at)} ({formatRelativeTime(order.submitted_at)})
          </p>
        </div>

        {/* 거래처 정보 링크 */}
        {dealer?.id && (
          <Link
            href={`/admin/dealers/${dealer.id}`}
            className="text-xs text-blue-600 hover:underline"
            target="_blank"
          >
            거래처 정보 보기
          </Link>
        )}
      </div>

      {/* 본문: 좌측 + 우측 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 발주 정보 (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* 발주 품목 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">발주 품목</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(items ?? []).map((item: OrderItem) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-zinc-900">
                      {item.pc_name_snapshot}{' '}
                      <span className="text-zinc-400 text-xs">x {item.quantity}</span>
                    </p>
                    <p className="text-xs text-zinc-400">
                      단가: {formatKRW(item.unit_price_snapshot)}
                    </p>
                    {item.source_type === 'quote' && item.source_quote_id && sourceQuoteMap[item.source_quote_id] && (
                      <Link
                        href={`/admin/quotes/${sourceQuoteMap[item.source_quote_id].rfq_id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        원본 견적: {sourceQuoteMap[item.source_quote_id].quote_no}
                      </Link>
                    )}
                  </div>
                  <span className="font-medium">{formatKRW(item.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-end pt-3 border-t text-lg font-bold">
                합계: {formatKRW(order.total_amount)}{' '}
                <span className="text-xs font-normal text-zinc-400 ml-1">(VAT 별도)</span>
              </div>
            </CardContent>
          </Card>

          {/* 배송 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">배송 정보</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {order.shipping_label && (
                <p className="font-medium">{order.shipping_label}</p>
              )}
              <p>
                {order.shipping_recipient} / {order.shipping_phone}
              </p>
              {order.shipping_address && (
                <p className="text-zinc-500">
                  {formatAddress({
                    postal_code: order.shipping_postal_code,
                    address: order.shipping_address,
                    address_detail: order.shipping_address_detail,
                  })}
                </p>
              )}
              {order.shipping_memo && (
                <p className="text-xs text-zinc-400">메모: {order.shipping_memo}</p>
              )}
            </CardContent>
          </Card>

          {/* 희망 납기 / 요청사항 */}
          {(order.desired_ship_date || order.dealer_memo) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">희망 납기 / 요청사항</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {order.desired_ship_date && (
                  <div className="flex gap-2">
                    <span className="text-zinc-500">희망 납기:</span>
                    <span>{formatDate(order.desired_ship_date)}</span>
                  </div>
                )}
                {order.dealer_memo && (
                  <div>
                    <span className="text-zinc-500">요청사항:</span>
                    <p className="mt-1 whitespace-pre-wrap">{order.dealer_memo}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 우측: 액션 패널 (1/3) */}
        <div>
          <OrderActionPanel order={order as Order} />
        </div>
      </div>

      {/* 하단: 이력 타임라인 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">이력 타임라인</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline
            events={(events ?? []) as OrderEvent[]}
            showInternal={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
