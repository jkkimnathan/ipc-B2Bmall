/**
 * 거래처 리퍼 부품 상세 페이지
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import RefurbDetailClient from '@/components/dealer/refurb/RefurbDetailClient'
import type { RefurbPart } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DealerRefurbDetailPage({ params }: PageProps) {
  await requireDealer()
  const { id } = await params
  const supabase = await createClient()

  const { data: part, error } = await supabase
    .from('refurb_parts')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !part) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dealer/refurb"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit"
      >
        <ArrowLeft className="size-4" />
        목록으로
      </Link>

      <RefurbDetailClient part={part as RefurbPart} />
    </div>
  )
}
