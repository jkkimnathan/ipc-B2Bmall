/**
 * 새 견적 요청 작성 페이지
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import QuoteRequestForm from '@/components/dealer/quotes/QuoteRequestForm'
import type { DealerAddress } from '@/types/database'

export default async function NewQuoteRequestPage() {
  const session = await requireDealer()
  const supabase = await createClient()

  // 배송지 목록
  const { data: addresses } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('dealer_id', session.dealer.id)
    .order('is_default', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dealer/quotes"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit"
      >
        <ArrowLeft className="size-4" />
        견적 목록
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900">새 견적 요청</h1>
        <p className="text-sm text-zinc-500">원하는 PC 구성과 조건을 입력해주세요</p>
      </div>

      <QuoteRequestForm
        addresses={(addresses ?? []) as DealerAddress[]}
        dealerId={session.dealer.id}
      />
    </div>
  )
}
