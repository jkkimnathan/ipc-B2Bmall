/**
 * 거래처 정보 수정 페이지
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DealerForm from '@/components/admin/dealers/DealerForm'
import type { Dealer } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditDealerPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: dealer, error } = await supabase
    .from('dealers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !dealer) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/admin/dealers/${id}`} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit">
        <ArrowLeft className="size-4" />
        거래처 상세로
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900">거래처 정보 수정</h1>

      <DealerForm mode="edit" initialData={dealer as Dealer} />
    </div>
  )
}
