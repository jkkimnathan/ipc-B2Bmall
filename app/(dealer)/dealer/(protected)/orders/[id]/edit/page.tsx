/**
 * 거래처 발주 수정 페이지
 * 1시간 이내 + submitted 상태만 접근 가능
 */
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { canEditOrder } from '@/lib/utils/format'
import OrderEditClient from '@/components/dealer/orders/OrderEditClient'
import type { Order, OrderItem, DealerAddress } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DealerOrderEditPage({ params }: PageProps) {
  const session = await requireDealer()
  const { id } = await params
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order || order.dealer_id !== session.dealer.id) notFound()

  // 수정 불가하면 상세로 리다이렉트
  if (!canEditOrder(order)) redirect(`/dealer/orders/${id}`)

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('pc_name_snapshot')

  const { data: addresses } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('dealer_id', session.dealer.id)
    .order('is_default', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/dealer/orders/${id}`}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit"
      >
        <ArrowLeft className="size-4" />
        돌아가기
      </Link>

      <OrderEditClient
        order={order as Order}
        items={(items ?? []) as OrderItem[]}
        addresses={(addresses ?? []) as DealerAddress[]}
      />
    </div>
  )
}
