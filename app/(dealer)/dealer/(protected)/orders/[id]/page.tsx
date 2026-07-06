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

  // 발주서/항목/배송지/이벤트를 병렬 조회 (모두 id·dealer_id만 필요)
  const [{ data: order, error }, { data: items }, { data: addresses }, { data: events }] =
    await Promise.all([
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_items').select('*').eq('order_id', id).order('pc_name_snapshot'),
      supabase
        .from('dealer_addresses')
        .select('*')
        .eq('dealer_id', session.dealer.id)
        .order('is_default', { ascending: false }),
      supabase
        .from('order_events')
        .select('*')
        .eq('order_id', id)
        .eq('is_visible_to_dealer', true)
        .order('created_at', { ascending: false }),
    ])

  // 본인 거래처가 아니면 notFound (RLS가 이미 차단하지만 이중 확인)
  if (error || !order || order.dealer_id !== session.dealer.id) notFound()

  // 내부 메모(admin_memo)는 거래처 클라이언트로 직렬화되지 않도록 제거
  const safeOrder = { ...(order as Order), admin_memo: null }

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
        order={safeOrder}
        items={(items ?? []) as OrderItem[]}
        addresses={(addresses ?? []) as DealerAddress[]}
        events={(events ?? []) as OrderEvent[]}
      />
    </div>
  )
}
