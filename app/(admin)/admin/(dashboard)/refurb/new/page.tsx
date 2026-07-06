/**
 * 새 리퍼 부품 등록 페이지
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/admin'
import RefurbForm from '@/components/admin/refurb/RefurbForm'

export default async function NewRefurbPage() {
  await requireAdmin()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/refurb"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="size-4" />
          목록으로
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">새 리퍼 부품 등록</h1>

      <RefurbForm mode="create" />
    </div>
  )
}
