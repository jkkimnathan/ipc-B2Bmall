/**
 * 거래처 표준 PC 카탈로그
 * 활성화된 PC만 카드 그리드로 표시.
 */
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import ProductCatalog from '@/components/dealer/products/ProductCatalog'
import type { StandardPc } from '@/types/database'

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function DealerProductsPage({ searchParams }: PageProps) {
  await requireDealer()
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('standard_pcs')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name')

  if (sp.category) {
    query = query.eq('category', sp.category)
  }

  if (sp.q) {
    query = query.or(`name.ilike.%${sp.q}%,sku.ilike.%${sp.q}%`)
  }

  const { data: products } = await query

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">iPC 표준 라인업</h1>
        <p className="text-sm text-zinc-500 mt-1">원하시는 모델을 장바구니에 담아 발주해주세요</p>
      </div>

      <ProductCatalog
        products={(products ?? []) as StandardPc[]}
        currentCategory={sp.category}
        currentQuery={sp.q}
      />
    </div>
  )
}
