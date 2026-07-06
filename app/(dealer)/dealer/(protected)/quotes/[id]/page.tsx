/**
 * 거래처 견적 요청 상세 페이지
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { checkAndExpireQuote } from '@/lib/rfq/autoExpire'
import { signRfqAttachments } from '@/lib/storage/signed'
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

  // RFQ/견적서/이벤트를 병렬 조회 (만료 처리 후, 모두 id만 필요)
  const [{ data: rfq, error }, { data: quote }, { data: events }] = await Promise.all([
    supabase.from('quote_requests').select('*').eq('id', id).single(),
    supabase
      .from('quotes')
      .select('*')
      .eq('rfq_id', id)
      .in('status', ['sent', 'accepted', 'rejected', 'expired'])
      .single(),
    supabase
      .from('rfq_events')
      .select('*')
      .eq('rfq_id', id)
      .eq('is_visible_to_dealer', true)
      .order('created_at', { ascending: false }),
  ])

  if (error || !rfq || rfq.dealer_id !== session.dealer.id) notFound()

  // 첨부파일은 비공개 버킷의 signed URL 로 변환하여 전달
  const attachments = await signRfqAttachments((rfq.attachment_urls as string[]) ?? [])

  // 내부 메모(admin_memo)는 거래처 클라이언트로 직렬화되지 않도록 제거
  const safeQuote = quote ? { ...(quote as Quote), admin_memo: null } : null

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
        quote={safeQuote}
        events={(events ?? []) as RfqEvent[]}
        attachments={attachments.map((a) => ({ url: a.url, name: a.name }))}
      />
    </div>
  )
}
