/**
 * 표준 PC 관리 목록 페이지
 * 검색/필터/정렬 + 활성 토글 + 수정/삭제 액션을 제공한다.
 */
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatKRW, categoryLabel, stockStatusLabel } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Package } from 'lucide-react'

import ProductFilters from '@/components/admin/products/ProductFilters'
import { ProductActiveToggle, ProductDropdownActions } from '@/components/admin/products/ProductRowActions'

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; active?: string }>
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { q, category, active } = params

  const supabase = await createClient()

  // 쿼리 구성
  let query = supabase
    .from('standard_pcs')
    .select('*')
    .order('updated_at', { ascending: false })

  // 검색: PC명 또는 SKU 부분일치
  if (q) {
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
  }

  // 카테고리 필터
  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  // 활성 상태 필터
  if (active === 'true') query = query.eq('is_active', true)
  if (active === 'false') query = query.eq('is_active', false)

  const { data: products, error } = await query

  if (error) {
    return (
      <div className="text-center text-red-500">
        데이터를 불러오는 중 오류가 발생했습니다: {error.message}
      </div>
    )
  }

  // 재고 상태 Badge 색상 매핑
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
          <h1 className="text-2xl font-bold text-zinc-900">표준 PC 관리</h1>
          <p className="text-sm text-zinc-500">iPC 표준 라인업을 등록/수정/삭제합니다</p>
        </div>
        <Button render={<Link href="/admin/products/new" />}>
          <Plus className="size-4" />
          새 PC 등록
        </Button>
      </div>

      {/* 필터 */}
      <Suspense>
        <ProductFilters />
      </Suspense>

      {/* 테이블 */}
      {products && products.length > 0 ? (
        <>
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[64px]">썸네일</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>PC명</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead className="text-right">단가</TableHead>
                  <TableHead>재고</TableHead>
                  <TableHead>활성</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const thumbSrc = product.thumbnail_urls?.[0]
                  const stock = stockStatusLabel(product.stock_status)
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={product.name}
                            className="size-10 rounded border bg-zinc-50 object-contain p-0.5"
                          />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded border bg-zinc-100">
                            <Package className="size-4 text-zinc-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{categoryLabel(product.category)}</TableCell>
                      <TableCell className="text-right">{formatKRW(product.sale_price)}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(stock.color)}>{stock.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <ProductActiveToggle id={product.id} isActive={product.is_active} />
                      </TableCell>
                      <TableCell>
                        <ProductDropdownActions
                          id={product.id}
                          isActive={product.is_active}
                          name={product.name}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-right text-sm text-zinc-400">총 {products.length}건</p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-white py-16 text-center">
          <Package className="size-12 text-zinc-300" />
          <div>
            <p className="text-lg font-medium text-zinc-700">등록된 표준 PC가 없습니다</p>
            <p className="text-sm text-zinc-400">새 PC를 등록하여 시작하세요.</p>
          </div>
          <Button render={<Link href="/admin/products/new" />}>
            <Plus className="size-4" />
            새 PC 등록
          </Button>
        </div>
      )}
    </div>
  )
}
