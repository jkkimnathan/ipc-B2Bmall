/**
 * 거래처 관리 목록 페이지
 */
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatBusinessNo, dealerStatusLabel, formatDate, sanitizeSearch } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Building2 } from 'lucide-react'

import DealerFilters from '@/components/admin/dealers/DealerFilters'

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function DealersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { status, q } = params
  const supabase = await createClient()

  // 승인대기 카운트 (탭 배지용)
  const { count: pendingCount } = await supabase
    .from('dealers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // 메인 쿼리 - 담당자 수도 포함
  let query = supabase
    .from('dealers')
    .select('*, dealer_users(id)')

  // 상태 필터
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  // 검색
  const safeQ = sanitizeSearch(q)
  if (safeQ) {
    query = query.or(
      `company_name.ilike.%${safeQ}%,business_no.ilike.%${safeQ}%,contact_name.ilike.%${safeQ}%`
    )
  }

  // 정렬: 승인대기는 오래된 순, 나머지는 최신순
  if (status === 'pending') {
    query = query.order('created_at', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: dealers, error } = await query

  if (error) {
    return <div className="text-red-500">데이터 로드 오류: {error.message}</div>
  }

  const badgeVariant = (color: string) => {
    if (color === 'green') return 'default' as const
    if (color === 'red') return 'destructive' as const
    return 'secondary' as const
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">거래처 관리</h1>
          <p className="text-sm text-zinc-500">등록된 거래처를 조회하고 가입신청을 처리합니다</p>
        </div>
        <Button render={<Link href="/admin/dealers/new" />}>
          <Plus className="size-4" />
          거래처 직접 등록
        </Button>
      </div>

      {/* 필터 */}
      <Suspense>
        <DealerFilters pendingCount={pendingCount ?? 0} />
      </Suspense>

      {/* 테이블 */}
      {dealers && dealers.length > 0 ? (
        <>
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상호</TableHead>
                  <TableHead>사업자번호</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead className="text-center">담당자수</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealers.map((dealer) => {
                  const st = dealerStatusLabel(dealer.status)
                  const userCount = Array.isArray(dealer.dealer_users) ? dealer.dealer_users.length : 0
                  return (
                    <TableRow key={dealer.id}>
                      <TableCell>
                        <Link
                          href={`/admin/dealers/${dealer.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {dealer.company_name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatBusinessNo(dealer.business_no)}
                      </TableCell>
                      <TableCell>{dealer.contact_name ?? '—'}</TableCell>
                      <TableCell className="text-sm">{dealer.phone ?? '—'}</TableCell>
                      <TableCell className="text-center">{userCount}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(st.color)}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400">
                        {formatDate(dealer.created_at)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/dealers/${dealer.id}`}
                          className="text-sm text-zinc-500 hover:text-zinc-900"
                        >
                          상세
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-right text-sm text-zinc-400">총 {dealers.length}건</p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-white py-16 text-center">
          <Building2 className="size-12 text-zinc-300" />
          <div>
            <p className="text-lg font-medium text-zinc-700">등록된 거래처가 없습니다</p>
            <p className="text-sm text-zinc-400">거래처를 직접 등록하거나 가입신청을 기다려주세요.</p>
          </div>
          <Button render={<Link href="/admin/dealers/new" />}>
            <Plus className="size-4" />
            거래처 직접 등록
          </Button>
        </div>
      )}
    </div>
  )
}
