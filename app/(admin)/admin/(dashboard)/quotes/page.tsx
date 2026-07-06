/**
 * 관리자 견적 요청 관리 목록 페이지
 */
import Link from 'next/link'
import { AlertTriangle, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import AdminRfqFilters from '@/components/admin/quotes/AdminRfqFilters'
import {
  formatDateTime, formatRelativeTime, rfqStatusLabel, purposeLabel,
} from '@/lib/utils/format'

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

function statusVariant(status: string) {
  if (status === 'canceled' || status === 'rejected' || status === 'expired') return 'destructive' as const
  if (status === 'accepted' || status === 'converted_to_order') return 'outline' as const
  if (status === 'submitted') return 'default' as const
  return 'secondary' as const
}

export default async function AdminQuotesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const supabase = await createClient()

  const statusFilter = sp.status ?? ''
  const q = sp.q ?? ''
  const period = sp.period ?? ''

  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // 목록 쿼리
  let query = supabase
    .from('quote_requests')
    .select('*, dealers(company_name)')

  if (statusFilter === 'done') {
    query = query.in('status', ['converted_to_order', 'expired', 'canceled'])
  } else if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  if (q) {
    query = query.or(`title.ilike.%${q}%,rfq_no.ilike.%${q}%`)
  }

  if (period === 'today') {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    query = query.gte('submitted_at', todayStart.toISOString())
  } else if (period === '7d') {
    query = query.gte('submitted_at', new Date(Date.now() - 7 * 86400000).toISOString())
  } else if (period === '30d') {
    query = query.gte('submitted_at', new Date(Date.now() - 30 * 86400000).toISOString())
  }

  // 회신대기는 오래된 순(긴급), 나머지는 최신순
  if (statusFilter === 'submitted') {
    query = query.order('submitted_at', { ascending: true })
  } else {
    query = query.order('submitted_at', { ascending: false })
  }

  query = query.limit(100)

  // 목록 + 회신대기/24시간 초과 카운트를 병렬 조회
  const [{ data: rfqs }, { count: submittedCount }, { count: overdueCount }] =
    await Promise.all([
      query,
      supabase
        .from('quote_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted'),
      supabase
        .from('quote_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted')
        .lt('submitted_at', cutoff24h),
    ])

  // 거래처명 클라이언트 필터
  let filtered = rfqs ?? []
  if (q) {
    const lq = q.toLowerCase()
    filtered = filtered.filter((r) => {
      const cn = (r.dealers as { company_name: string } | null)?.company_name ?? ''
      return r.rfq_no.toLowerCase().includes(lq) ||
        r.title.toLowerCase().includes(lq) ||
        cn.toLowerCase().includes(lq)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">견적 요청 관리</h1>
        <p className="text-sm text-zinc-500">거래처의 견적 요청을 확인하고 회신합니다</p>
      </div>

      {(overdueCount ?? 0) > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertTriangle className="size-4 shrink-0" />
          <span>24시간 이상 미회신 견적 요청 {overdueCount}건이 있습니다.</span>
        </div>
      )}

      <AdminRfqFilters submittedCount={submittedCount ?? 0} />

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400">
          조건에 맞는 견적 요청이 없습니다.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead className="w-[180px]">RFQ 번호</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>용도</TableHead>
                <TableHead className="text-center">수량</TableHead>
                <TableHead>요청일</TableHead>
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rfq) => {
                const st = rfqStatusLabel(rfq.status)
                const cn = (rfq.dealers as { company_name: string } | null)?.company_name ?? '—'
                const isOverdue = rfq.status === 'submitted' &&
                  new Date(rfq.submitted_at).getTime() < Date.now() - 24 * 60 * 60 * 1000

                return (
                  <TableRow key={rfq.id} className="cursor-pointer hover:bg-zinc-50">
                    <TableCell>
                      {isOverdue && <Circle className="size-2.5 fill-red-500 text-red-500" />}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/quotes/${rfq.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {rfq.rfq_no}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{cn}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{rfq.title}</TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {rfq.purpose ? purposeLabel(rfq.purpose) : '—'}
                    </TableCell>
                    <TableCell className="text-center text-sm">{rfq.quantity}대</TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {formatDateTime(rfq.submitted_at)}
                      {rfq.status === 'submitted' && (
                        <p className="text-[11px] text-zinc-400">{formatRelativeTime(rfq.submitted_at)}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusVariant(rfq.status)}>{st.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <p className="text-right text-xs text-zinc-400">총 {filtered.length}건</p>
        </>
      )}
    </div>
  )
}
