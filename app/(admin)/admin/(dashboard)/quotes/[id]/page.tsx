/**
 * 관리자 견적 요청 상세 페이지
 *
 * 좌: RFQ 요청 내용   우: QuoteComposer (견적서 작성) 또는 결과 표시
 * 하단: RfqTimeline (이력)
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileDown, CheckCircle, XCircle, Clock, Package } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { checkAndExpireQuote } from '@/lib/rfq/autoExpire'
import { signRfqAttachments } from '@/lib/storage/signed'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SpecSlotInput from '@/components/shared/SpecSlotInput'
import QuoteComposer from '@/components/admin/quotes/QuoteComposer'
import RfqTimeline from '@/components/admin/quotes/RfqTimeline'
import {
  formatKRW, formatDateTime, formatDate, formatAddress,
  rfqStatusLabel, purposeLabel, quoteStatusLabel,
} from '@/lib/utils/format'
import type { QuoteRequest, Quote, RfqEvent } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

function statusVariant(status: string) {
  if (status === 'canceled' || status === 'rejected' || status === 'expired') return 'destructive' as const
  if (status === 'accepted' || status === 'converted_to_order') return 'outline' as const
  if (status === 'submitted') return 'default' as const
  return 'secondary' as const
}

/** 견적서가 편집 가능한 상태인지 (submitted/quoted + draft/sent만) */
function isQuoteEditable(rfqStatus: string, quoteStatus?: string): boolean {
  if (rfqStatus === 'submitted' || rfqStatus === 'quoted') {
    return !quoteStatus || quoteStatus === 'draft' || quoteStatus === 'sent'
  }
  return false
}

export default async function AdminQuoteDetailPage({ params }: PageProps) {
  await requireAdmin()
  const { id } = await params
  const supabase = await createClient()

  // 만료 자동 처리 (페이지 진입 시)
  await checkAndExpireQuote(id)

  // RFQ/견적서/이벤트를 병렬 조회 (만료 처리 후, 모두 id만 필요)
  const [{ data: rfq, error }, { data: quote }, { data: events }] = await Promise.all([
    supabase.from('quote_requests').select('*, dealers(company_name)').eq('id', id).single(),
    supabase.from('quotes').select('*').eq('rfq_id', id).single(),
    supabase.from('rfq_events').select('*').eq('rfq_id', id).order('created_at', { ascending: false }),
  ])

  if (error || !rfq) notFound()

  const st = rfqStatusLabel(rfq.status)
  const companyName = (rfq.dealers as { company_name: string } | null)?.company_name ?? '—'
  const editable = isQuoteEditable(rfq.status, quote?.status)

  // 첨부파일은 스토리지 경로로 저장되며 rfq-attachments 버킷은 비공개이므로 서명 URL 생성
  const signedAttachments = await signRfqAttachments(rfq.attachment_urls ?? [])

  // 거절 사유 (이벤트에서 추출)
  const rejectionEvent = (events ?? []).find(
    (e: { event_type: string }) => e.event_type === 'rejected_by_dealer'
  )
  const rejectionReason = (rejectionEvent as { message?: string })?.message ?? ''

  return (
    <div className="flex flex-col gap-6">
      {/* 뒤로가기 */}
      <Link
        href="/admin/quotes"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit"
      >
        <ArrowLeft className="size-4" />
        목록으로
      </Link>

      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">{rfq.rfq_no}</h1>
          <Badge variant={statusVariant(rfq.status)}>{st.label}</Badge>
          {quote && (
            <Badge variant="secondary" className="text-xs">
              견적서: {quoteStatusLabel(quote.status).label}
            </Badge>
          )}
        </div>
        <p className="text-sm text-zinc-600 mt-1">{rfq.title}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          거래처: {companyName} · 제출: {formatDateTime(rfq.submitted_at)}
        </p>
      </div>

      {/* 결과 배너 (완료 상태일 때만) */}
      {!editable && quote && (
        <ResultBanner
          rfqStatus={rfq.status}
          quoteStatus={quote.status}
          convertedOrderId={quote.converted_order_id}
          rejectionReason={rejectionReason}
        />
      )}

      {/* 좌우 레이아웃 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 좌: 요청 내용 */}
        <div className="space-y-5">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-zinc-500">용도:</span>{' '}
                  <span>{rfq.purpose ? purposeLabel(rfq.purpose) : '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">수량:</span>{' '}
                  <span>{rfq.quantity}대</span>
                </div>
                <div>
                  <span className="text-zinc-500">대당 희망 예산:</span>{' '}
                  <span>{rfq.budget_per_unit ? formatKRW(rfq.budget_per_unit) : '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">희망 납기:</span>{' '}
                  <span>{rfq.desired_ship_date ? formatDate(rfq.desired_ship_date) : '—'}</span>
                </div>
              </div>
              {rfq.requirements && (
                <div className="pt-2 border-t">
                  <span className="text-zinc-500">메모:</span>
                  <p className="mt-1 whitespace-pre-wrap">{rfq.requirements}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 구성 요구사항 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">구성 요구사항</CardTitle>
            </CardHeader>
            <CardContent>
              <SpecSlotInput value={rfq.spec_json} readOnly />
            </CardContent>
          </Card>

          {/* 배송 정보 */}
          {rfq.shipping_address && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">배송 정보</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {rfq.shipping_label && <p className="font-medium">{rfq.shipping_label}</p>}
                <p>{rfq.shipping_recipient} / {rfq.shipping_phone}</p>
                <p className="text-zinc-500">
                  {formatAddress({
                    postal_code: rfq.shipping_postal_code,
                    address: rfq.shipping_address!,
                    address_detail: rfq.shipping_address_detail,
                  })}
                </p>
                {rfq.shipping_memo && (
                  <p className="text-xs text-zinc-400">메모: {rfq.shipping_memo}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 첨부파일 */}
          {signedAttachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">첨부파일</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {signedAttachments.map((att, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <FileDown className="size-4 text-zinc-400" />
                      {att.url ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {att.name}
                        </a>
                      ) : (
                        <span className="text-sm text-zinc-400" title="첨부파일을 불러올 수 없습니다.">
                          {att.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 우: 견적서 작성 or 읽기 전용 */}
        <div>
          {editable ? (
            <>
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">견적서 작성</h2>
              <QuoteComposer
                rfq={rfq as QuoteRequest}
                existingQuote={(quote as Quote) ?? null}
              />
            </>
          ) : quote ? (
            <QuoteReadOnly quote={quote as Quote} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-zinc-400">
                견적서가 작성되지 않았습니다.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 하단: 이력 타임라인 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">처리 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <RfqTimeline events={(events ?? []) as RfqEvent[]} showInternal />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// 결과 배너 (완료 상태)
// ============================================================

function ResultBanner({
  rfqStatus,
  quoteStatus,
  convertedOrderId,
  rejectionReason,
}: {
  rfqStatus: string
  quoteStatus: string
  convertedOrderId: string | null
  rejectionReason: string
}) {
  if (rfqStatus === 'converted_to_order' || quoteStatus === 'accepted') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 p-4">
        <Package className="size-5 text-green-600 shrink-0" />
        <div>
          <p className="font-medium text-green-800">발주 전환 완료</p>
          {convertedOrderId && (
            <Link
              href={`/admin/orders/${convertedOrderId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              발주서 보기 →
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (rfqStatus === 'rejected' || quoteStatus === 'rejected') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
        <XCircle className="size-5 text-red-600 shrink-0" />
        <div>
          <p className="font-medium text-red-800">거래처 거절</p>
          {rejectionReason && (
            <p className="text-sm text-red-600">사유: {rejectionReason}</p>
          )}
        </div>
      </div>
    )
  }

  if (rfqStatus === 'expired' || quoteStatus === 'expired') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-50 p-4">
        <Clock className="size-5 text-zinc-500 shrink-0" />
        <p className="font-medium text-zinc-600">견적서 만료됨</p>
      </div>
    )
  }

  return null
}

// ============================================================
// 견적서 읽기 전용 표시
// ============================================================

function QuoteReadOnly({ quote }: { quote: Quote }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-zinc-900">견적서 (읽기 전용)</h2>

      {/* 제안 사양 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">제안 사양</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SpecSlotInput value={quote.spec_json} readOnly />
          {quote.proposed_spec && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-zinc-700">추가 설명</p>
              <p className="text-sm text-zinc-600 mt-1 whitespace-pre-wrap">{quote.proposed_spec}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 가격 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">가격 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-zinc-50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">단가</span>
              <span>{formatKRW(quote.unit_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">수량</span>
              <span>{quote.quantity}대</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t">
              <span>합계 {quote.vat_included ? '(VAT 포함)' : '(VAT 별도)'}</span>
              <span className="text-blue-600">{formatKRW(quote.total_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 납기 / 유효기한 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">납기 / 유효기한</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-zinc-500">납기</span>
            <span>{quote.lead_time_days}영업일</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">유효기한</span>
            <span>{formatDate(quote.valid_until)}</span>
          </div>
          {quote.sent_at && (
            <div className="flex justify-between">
              <span className="text-zinc-500">발송일</span>
              <span>{formatDateTime(quote.sent_at)}</span>
            </div>
          )}
          {quote.responded_at && (
            <div className="flex justify-between">
              <span className="text-zinc-500">응답일</span>
              <span>{formatDateTime(quote.responded_at)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 메모 */}
      {quote.admin_memo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">내부 메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 whitespace-pre-wrap">{quote.admin_memo}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
