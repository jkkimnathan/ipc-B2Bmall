/**
 * 리퍼 부품 수정 페이지
 * params.id로 기존 데이터를 가져와서 RefurbForm에 전달한다.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import RefurbForm from '@/components/admin/refurb/RefurbForm'
import type { RefurbPart } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditRefurbPage({ params }: PageProps) {
  await requireAdmin()
  const { id } = await params
  const supabase = await createClient()

  const { data: part, error } = await supabase
    .from('refurb_parts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !part) {
    notFound()
  }

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

      <h1 className="text-2xl font-bold text-zinc-900">리퍼 부품 수정</h1>

      <RefurbForm mode="edit" initialData={part as RefurbPart} />
    </div>
  )
}
