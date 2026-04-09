/**
 * 거래처 견적 요청 목록 페이지
 */
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import QuoteFilters from '@/components/dealer/quotes/QuoteFilters'
import { formatKRW, formatDateTime, rfqStatusLabel } from '@/lib/utils/format'

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

function statusVariant(status: string) {
  if (status === 'canceled' || status === 'rejected' || status === 'expired') return 'destructive' as const
  if (status === 'accepted' || status === 'converted_to_order') return 'outline' as const
  if (status === 'submitted') return 'default' as const
  return 'secondary' as const
}

export default async function DealerQuotesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const session = await requireDealer()
  const supabase = await createClient()

  const statusFilter = sp.status ?? ''
  const q = sp.q ?? ''
  const period = sp.period ?? ''

  // 회신대기 카운트
  const { count: submittedCount } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .eq('dealer_id', session.dealer.id)
    .eq('status', 'submitted')

  // 목록 쿼리
  let query = supabase
    .from('quote_requests')
    .select('*')
    .eq('dealer_id', session.dealer.id)

  // 상태 필터
  if (statusFilter === 'done') {
    query = query.in('status', ['converted_to_order', 'expired', 'canceled'])
  } else if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  // 검색
  if (q) {
    query = query.or(`title.ilike.%${q}%,rfq_no.ilike.%${q}%`)
  }

  // 기간
  if (period === 'today') {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    query = query.gte('submitted_at', todayStart.toISOString())
  } else if (period === '7d') {
    query = query.gte('submitted_at', new Date(Date.now() - 7 * 86400000).toISOString())
  } else if (period === '30d') {
    query = query.gte('submitted_at', new Date(Date.now() - 30 * 86400000).toISOString())
  }

  query = query.order('submitted_at', { ascending: false }).limit(100)

  const { data: rfqs } = await query

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">견적 요청</h1>
          <p className="text-sm text-zinc-500">원하는 PC 구성에 대한 견적을 요청하세요</p>
        </div>
        <Link href="/dealer/quotes/new">
          <Button>
            <Plus className="size-4 mr-1" /> 새 견적 요청
          </Button>
        </Link>
      </div>

      {/* 필터 */}
      <QuoteFilters submittedCount={submittedCount ?? 0} />

      {/* 테이블 */}
      {(!rfqs || rfqs.length === 0) ? (
        <div className="py-12 text-center text-sm text-zinc-400 space-y-3">
          <p>아직 견적 요청이 없습니다.</p>
          <Link href="/dealer/quotes/new">
            <Button variant="outline">
              <Plus className="size-4 mr-1" /> 새 견적 요청
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">RFQ 번호</TableHead>
                <TableHead>제목</TableHead>
                <TableHead className="text-center">수량</TableHead>
                <TableHead>요청일</TableHead>
                <TableHead className="text-right">견적금액</TableHead>
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.map((rfq) => {
                const st = rfqStatusLabel(rfq.status)
                return (
                  <TableRow key={rfq.id} className="cursor-pointer hover:bg-zinc-50">
                    <TableCell>
                      <Link
                        href={`/dealer/quotes/${rfq.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {rfq.rfq_no}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">
                      {rfq.title}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {rfq.quantity}대
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {formatDateTime(rfq.submitted_at)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {rfq.budget_per_unit
                        ? `~${formatKRW(rfq.budget_per_unit)}/대`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusVariant(rfq.status)}>
                        {st.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <p className="text-right text-xs text-zinc-400">총 {rfqs.length}건</p>
        </>
      )}
    </div>
  )
}
