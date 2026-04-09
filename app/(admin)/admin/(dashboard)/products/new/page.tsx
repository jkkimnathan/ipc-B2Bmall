/**
 * 새 표준 PC 등록 페이지
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ProductForm from '@/components/admin/products/ProductForm'

export default function NewProductPage() {
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

      <h1 className="text-2xl font-bold text-zinc-900">새 표준 PC 등록</h1>

      <ProductForm mode="create" />
    </div>
  )
}
