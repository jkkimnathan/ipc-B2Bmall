/**
 * 거래처 리퍼 부품 카탈로그
 * 활성화된 리퍼 부품만 카드 그리드로 표시.
 */
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import RefurbCatalog from '@/components/dealer/refurb/RefurbCatalog'
import type { RefurbPart } from '@/types/database'

interface PageProps {
  searchParams: Promise<{ part_type?: string; q?: string; grade?: string }>
}

export default async function DealerRefurbPage({ searchParams }: PageProps) {
  await requireDealer()
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('refurb_parts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (sp.part_type) {
    query = query.eq('part_type', sp.part_type)
  }

  if (sp.grade) {
    query = query.eq('condition_grade', sp.grade)
  }

  if (sp.q) {
    query = query.or(`name.ilike.%${sp.q}%,sku.ilike.%${sp.q}%,manufacturer.ilike.%${sp.q}%`)
  }

  const { data: parts } = await query

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">리퍼 부품</h1>
        <p className="text-sm text-zinc-500 mt-1">합리적인 가격의 검수 완료 리퍼비시 부품</p>
      </div>

      <RefurbCatalog
        parts={(parts ?? []) as RefurbPart[]}
        currentType={sp.part_type}
        currentQuery={sp.q}
        currentGrade={sp.grade}
      />
    </div>
  )
}
