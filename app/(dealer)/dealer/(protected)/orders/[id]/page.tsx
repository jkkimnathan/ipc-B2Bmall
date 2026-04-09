/**
 * 거래처 발주 상세 페이지
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import OrderDetailClient from '@/components/dealer/orders/OrderDetailClient'
import type { Order, OrderItem, DealerAddress, OrderEvent } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DealerOrderDetailPage({ params }: PageProps) {
  const session = await requireDealer()
  const { id } = await params
  const supabase = await createClient()

  // 발주서 조회
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  // 본인 거래처가 아니면 notFound
  if (error || !order || order.dealer_id !== session.dealer.id) notFound()

  // 발주 항목
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('pc_name_snapshot')

  // 배송지 목록 (수정용)
  const { data: addresses } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('dealer_id', session.dealer.id)
    .order('is_default', { ascending: false })

  // 이벤트 이력 (거래처 공개분만 서버에서 필터)
  const { data: events } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', id)
    .eq('is_visible_to_dealer', true)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dealer/orders"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit"
      >
        <ArrowLeft className="size-4" />
        목록으로
      </Link>

      <OrderDetailClient
        order={order as Order}
        items={(items ?? []) as OrderItem[]}
        addresses={(addresses ?? []) as DealerAddress[]}
        events={(events ?? []) as OrderEvent[]}
      />
    </div>
  )
}
