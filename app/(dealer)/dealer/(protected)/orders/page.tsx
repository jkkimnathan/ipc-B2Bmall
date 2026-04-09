/**
 * 거래처 발주 내역 페이지
 */
import Link from 'next/link'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatKRW, formatDate, orderStatusLabel } from '@/lib/utils/format'
import OrderFilters from '@/components/dealer/orders/OrderFilters'

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>
}

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  submitted: 'default',
  approved: 'secondary',
  in_production: 'secondary',
  shipped: 'default',
  completed: 'outline',
  rejected: 'destructive',
  canceled: 'destructive',
}

export default async function DealerOrdersPage({ searchParams }: PageProps) {
  const session = await requireDealer()
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select('*, order_items(count)')
    .eq('dealer_id', session.dealer.id)
    .order('submitted_at', { ascending: false })

  if (sp.status) {
    query = query.eq('status', sp.status)
  }

  if (sp.q) {
    query = query.ilike('order_no', `%${sp.q}%`)
  }

  const { data: orders } = await query

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-zinc-900">발주 내역</h1>

      <OrderFilters currentStatus={sp.status} currentQuery={sp.q} />

      {(!orders || orders.length === 0) ? (
        <p className="text-center py-12 text-sm text-zinc-400">발주 내역이 없습니다.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>발주번호</TableHead>
                <TableHead>발주일</TableHead>
                <TableHead className="text-right">합계</TableHead>
                <TableHead>배송지</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const st = orderStatusLabel(order.status)
                return (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-zinc-50">
                    <TableCell>
                      <Link href={`/dealer/orders/${order.id}`} className="font-medium text-blue-600 hover:underline">
                        {order.order_no}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(order.submitted_at)}</TableCell>
                    <TableCell className="text-right font-medium">{formatKRW(order.total_amount)}</TableCell>
                    <TableCell className="text-sm text-zinc-500">{order.shipping_label ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[order.status] ?? 'outline'}>
                        {st.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
