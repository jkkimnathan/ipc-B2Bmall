/**
 * 리퍼 부품 관리 목록 페이지
 * 검색/필터/정렬 + 활성 토글 + 수정/삭제 액션을 제공한다.
 */
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatKRW, partTypeLabel, conditionGradeLabel, sanitizeSearch } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Package } from 'lucide-react'

import RefurbFilters from '@/components/admin/refurb/RefurbFilters'
import { RefurbActiveToggle, RefurbDropdownActions } from '@/components/admin/refurb/RefurbRowActions'

interface PageProps {
  searchParams: Promise<{ q?: string; part_type?: string; active?: string }>
}

export default async function RefurbPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { q, part_type, active } = params

  const supabase = await createClient()

  // 쿼리 구성
  let query = supabase
    .from('refurb_parts')
    .select('*')
    .order('updated_at', { ascending: false })

  // 검색: 부품명 또는 SKU 부분일치
  const safeQ = sanitizeSearch(q)
  if (safeQ) {
    query = query.or(`name.ilike.%${safeQ}%,sku.ilike.%${safeQ}%`)
  }

  // 부품 종류 필터
  if (part_type && part_type !== 'all') {
    query = query.eq('part_type', part_type)
  }

  // 활성 상태 필터
  if (active === 'true') query = query.eq('is_active', true)
  if (active === 'false') query = query.eq('is_active', false)

  const { data: parts, error } = await query

  if (error) {
    return (
      <div className="text-center text-red-500">
        데이터를 불러오는 중 오류가 발생했습니다: {error.message}
      </div>
    )
  }

  // 등급 Badge 색상 매핑
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
          <h1 className="text-2xl font-bold text-zinc-900">리퍼 부품 관리</h1>
          <p className="text-sm text-zinc-500">리퍼비시 부품을 등록/수정/삭제합니다</p>
        </div>
        <Button render={<Link href="/admin/refurb/new" />}>
          <Plus className="size-4" />
          새 부품 등록
        </Button>
      </div>

      {/* 필터 */}
      <Suspense>
        <RefurbFilters />
      </Suspense>

      {/* 테이블 */}
      {parts && parts.length > 0 ? (
        <>
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[64px]">썸네일</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>부품명</TableHead>
                  <TableHead>종류</TableHead>
                  <TableHead>등급</TableHead>
                  <TableHead className="text-right">판매가</TableHead>
                  <TableHead>재고</TableHead>
                  <TableHead>활성</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part) => {
                  const thumbSrc = part.thumbnail_urls?.[0]
                  const grade = conditionGradeLabel(part.condition_grade)
                  return (
                    <TableRow key={part.id}>
                      <TableCell>
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={part.name}
                            className="size-10 rounded border bg-zinc-50 object-contain p-0.5"
                          />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded border bg-zinc-100">
                            <Package className="size-4 text-zinc-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{part.sku}</TableCell>
                      <TableCell className="font-medium">{part.name}</TableCell>
                      <TableCell>{partTypeLabel(part.part_type)}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(grade.color)}>{grade.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatKRW(part.sale_price)}</TableCell>
                      <TableCell>
                        {part.stock_quantity === 0 ? (
                          <Badge variant="destructive">0개</Badge>
                        ) : (
                          <span className="text-sm text-zinc-700">{part.stock_quantity}개</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <RefurbActiveToggle id={part.id} isActive={part.is_active} />
                      </TableCell>
                      <TableCell>
                        <RefurbDropdownActions
                          id={part.id}
                          isActive={part.is_active}
                          name={part.name}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-right text-sm text-zinc-400">총 {parts.length}건</p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-white py-16 text-center">
          <Package className="size-12 text-zinc-300" />
          <div>
            <p className="text-lg font-medium text-zinc-700">등록된 리퍼 부품이 없습니다</p>
            <p className="text-sm text-zinc-400">새 부품을 등록하여 시작하세요.</p>
          </div>
          <Button render={<Link href="/admin/refurb/new" />}>
            <Plus className="size-4" />
            새 부품 등록
          </Button>
        </div>
      )}
    </div>
  )
}
