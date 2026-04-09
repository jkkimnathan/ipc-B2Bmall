/**
 * 거래처 표준 PC 상세 페이지
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import ProductDetailClient from '@/components/dealer/products/ProductDetailClient'
import type { StandardPc } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DealerProductDetailPage({ params }: PageProps) {
  await requireDealer()
  const { id } = await params
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('standard_pcs')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !product) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dealer/products"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit"
      >
        <ArrowLeft className="size-4" />
        목록으로
      </Link>

      <ProductDetailClient product={product as StandardPc} />
    </div>
  )
}
