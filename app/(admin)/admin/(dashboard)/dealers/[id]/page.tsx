/**
 * 거래처 상세 페이지 (서버 컴포넌트)
 * 거래처 정보, 담당자 목록, 통계를 조회하여 클라이언트 컴포넌트에 전달한다.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DealerDetailClient from '@/components/admin/dealers/DealerDetailClient'
import type { Dealer, DealerUser } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DealerDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 거래처 정보
  const { data: dealer, error } = await supabase
    .from('dealers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !dealer) notFound()

  // 담당자 목록
  const { data: users } = await supabase
    .from('dealer_users')
    .select('*')
    .eq('dealer_id', id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  // 발주 건수
  const { count: orderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('dealer_id', id)

  // 견적요청 건수
  const { count: rfqCount } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .eq('dealer_id', id)

  // 사업자등록증 signed URL 생성 (비공개 버킷이므로 직접 접근 불가)
  let certSignedUrl: string | null = null
  if (dealer.business_cert_url) {
    const { data: signedData } = await supabase.storage
      .from('dealer-documents')
      .createSignedUrl(dealer.business_cert_url, 3600) // 1시간 유효
    certSignedUrl = signedData?.signedUrl ?? null
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/dealers"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit"
      >
        <ArrowLeft className="size-4" />
        목록으로
      </Link>

      <DealerDetailClient
        dealer={dealer as Dealer}
        users={(users ?? []) as DealerUser[]}
        orderCount={orderCount ?? 0}
        rfqCount={rfqCount ?? 0}
        certSignedUrl={certSignedUrl}
      />
    </div>
  )
}
