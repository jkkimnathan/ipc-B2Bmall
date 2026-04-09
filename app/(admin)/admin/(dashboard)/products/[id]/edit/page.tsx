/**
 * 표준 PC 수정 페이지
 * params.id로 기존 데이터를 가져와서 ProductForm에 전달한다.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ProductForm from '@/components/admin/products/ProductForm'
import type { StandardPc } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('standard_pcs')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !product) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="size-4" />
          목록으로
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">표준 PC 수정</h1>

      <ProductForm mode="edit" initialData={product as StandardPc} />
    </div>
  )
}
