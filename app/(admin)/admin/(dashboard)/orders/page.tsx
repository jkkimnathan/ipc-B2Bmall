/**
 * 관리자 발주 목록 페이지
 *
 * 상태 필터, 검색, 기간, 정렬을 지원하며
 * 24시간 이상 미처리 접수건 경고를 표시한다.
 */
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import AdminOrderFilters from '@/components/admin/orders/AdminOrderFilters'
import {
  formatKRW, formatDateTime, formatDate, formatRelativeTime,
  orderStatusLabel,
} from '@/lib/utils/format'

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

// 상태 배지 variant 매핑
function statusVariant(status: string) {
  if (status === 'rejected' || status === 'canceled') return 'destructive' as const
  if (status === 'completed') return 'outline' as const
  if (status === 'submitted') return 'default' as const
  return 'secondary' as const
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const supabase = await createClient()

  const statusFilter = sp.status ?? ''
  const q = sp.q ?? ''
  const period = sp.period ?? ''
  const sort = sp.sort ?? 'newest'

  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // 발주 목록 쿼리 작성
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items(count),
      dealers(company_name)
    `)

  // 상태 필터
  if (statusFilter === 'canceled_rejected') {
    query = query.in('status', ['canceled', 'rejected'])
  } else if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  // 검색 (발주번호, 거래처명, 수령인)
  if (q) {
    query = query.or(
      `order_no.ilike.%${q}%,shipping_recipient.ilike.%${q}%`
    )
  }

  // 기간 필터
  if (period === 'today') {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    query = query.gte('submitted_at', todayStart.toISOString())
  } else if (period === '7d') {
    query = query.gte(
      'submitted_at',
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    )
  } else if (period === '30d') {
    query = query.gte(
      'submitted_at',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    )
  }

  // 정렬
  if (sort === 'oldest') {
    query = query.order('submitted_at', { ascending: true })
  } else if (sort === 'ship_date') {
    query = query.order('desired_ship_date', { ascending: true, nullsFirst: false })
  } else {
    query = query.order('submitted_at', { ascending: false })
  }

  query = query.limit(100)

  // 목록 + 접수대기/24시간 초과 카운트를 병렬 조회
  const [{ data: orders }, { count: submittedCount }, { count: overdueCount }] =
    await Promise.all([
      query,
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted')
        .lt('submitted_at', cutoff24h),
    ])

  // 거래처명을 검색어로 추가 필터 (Supabase에서 join 검색이 제한적이므로 클라이언트 필터)
  let filteredOrders = orders ?? []
  if (q) {
    const lowerQ = q.toLowerCase()
    filteredOrders = filteredOrders.filter((o) => {
      const companyName = (o.dealers as { company_name: string } | null)?.company_name ?? ''
      return (
        o.order_no.toLowerCase().includes(lowerQ) ||
        companyName.toLowerCase().includes(lowerQ) ||
        (o.shipping_recipient ?? '').toLowerCase().includes(lowerQ)
      )
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 페이지 제목 */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">발주 관리</h1>
        <p className="text-sm text-zinc-500">거래처 발주를 확인하고 처리합니다</p>
      </div>

      {/* 24시간 미처리 경고 */}
      {(overdueCount ?? 0) > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertTriangle className="size-4 shrink-0" />
          <span>24시간 이상 미처리 발주 {overdueCount}건이 있습니다.</span>
        </div>
      )}

      {/* 필터 */}
      <AdminOrderFilters submittedCount={submittedCount ?? 0} />

      {/* 테이블 */}
      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400">
          조건에 맞는 발주가 없습니다.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">발주번호</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead className="text-center">품목</TableHead>
                <TableHead className="text-right">합계</TableHead>
                <TableHead>배송지</TableHead>
                <TableHead>희망납기</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead>접수일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const st = orderStatusLabel(order.status)
                const companyName =
                  (order.dealers as { company_name: string } | null)?.company_name ?? '—'
                const itemCount =
                  (order.order_items as { count: number }[])?.[0]?.count ?? 0

                return (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-zinc-50">
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {order.order_no}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{companyName}</TableCell>
                    <TableCell className="text-center text-sm">{itemCount}종</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatKRW(order.total_amount)}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500 max-w-[150px] truncate">
                      {order.shipping_label || order.shipping_recipient || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {order.desired_ship_date
                        ? formatDate(order.desired_ship_date)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusVariant(order.status)}>
                        {st.label}
                      </Badge>
                      {order.status === 'submitted' && (
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {formatRelativeTime(order.submitted_at)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {formatDateTime(order.submitted_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <p className="text-right text-xs text-zinc-400">
            총 {filteredOrders.length}건
          </p>
        </>
      )}
    </div>
  )
}
