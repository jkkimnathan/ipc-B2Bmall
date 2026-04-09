/**
 * 거래처 견적 요청 수정 페이지
 * submitted 상태가 아니면 상세로 리다이렉트
 */
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { canEditRfq } from '@/lib/utils/format'
import QuoteRequestForm from '@/components/dealer/quotes/QuoteRequestForm'
import type { QuoteRequest, DealerAddress } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditQuoteRequestPage({ params }: PageProps) {
  const session = await requireDealer()
  const { id } = await params
  const supabase = await createClient()

  const { data: rfq, error } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !rfq || rfq.dealer_id !== session.dealer.id) notFound()
  if (!canEditRfq(rfq)) redirect(`/dealer/quotes/${id}`)

  // 배송지 목록
  const { data: addresses } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('dealer_id', session.dealer.id)
    .order('is_default', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/dealer/quotes/${id}`}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit"
      >
        <ArrowLeft className="size-4" />
        상세로 돌아가기
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900">견적 요청 수정</h1>
        <p className="text-sm text-zinc-500">{rfq.rfq_no}</p>
      </div>

      <QuoteRequestForm
        addresses={(addresses ?? []) as DealerAddress[]}
        dealerId={session.dealer.id}
        initialData={rfq as QuoteRequest}
      />
    </div>
  )
}
