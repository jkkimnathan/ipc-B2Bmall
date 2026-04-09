/**
 * 거래처 견적 요청 상세 페이지
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { checkAndExpireQuote } from '@/lib/rfq/autoExpire'
import QuoteDetailClient from '@/components/dealer/quotes/QuoteDetailClient'
import type { QuoteRequest, Quote, RfqEvent } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DealerQuoteDetailPage({ params }: PageProps) {
  const session = await requireDealer()
  const { id } = await params
  const supabase = await createClient()

  // 만료 자동 처리 (페이지 진입 시)
  await checkAndExpireQuote(id)

  const { data: rfq, error } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !rfq || rfq.dealer_id !== session.dealer.id) notFound()

  // 견적서 조회 (draft 제외)
  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('rfq_id', id)
    .in('status', ['sent', 'accepted', 'rejected', 'expired'])
    .single()

  // RFQ 이벤트 (거래처에 공개된 것만)
  const { data: events } = await supabase
    .from('rfq_events')
    .select('*')
    .eq('rfq_id', id)
    .eq('is_visible_to_dealer', true)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dealer/quotes"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit"
      >
        <ArrowLeft className="size-4" />
        목록으로
      </Link>

      <QuoteDetailClient
        rfq={rfq as QuoteRequest}
        quote={(quote as Quote) ?? null}
        events={(events ?? []) as RfqEvent[]}
      />
    </div>
  )
}
