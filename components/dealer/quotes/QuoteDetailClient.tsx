'use client'

/**
 * 거래처 견적 요청 상세 클라이언트 컴포넌트
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, X, FileDown, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import SpecSlotInput from '@/components/shared/SpecSlotInput'
import RfqTimeline from '@/components/admin/quotes/RfqTimeline'
import QuoteActionPanel from '@/components/dealer/quotes/QuoteActionPanel'
import {
  formatKRW, formatDateTime, formatDate, formatAddress,
  rfqStatusLabel, canEditRfq, purposeLabel, quoteStatusLabel,
} from '@/lib/utils/format'
import { cancelQuoteRequest } from '@/app/(dealer)/dealer/(protected)/quotes/actions'
import type { QuoteRequest, Quote, RfqEvent } from '@/types/database'

interface Props {
  rfq: QuoteRequest
  quote: Quote | null
  events: RfqEvent[]
  attachments?: { url: string; name: string }[]
}

function statusVariant(status: string) {
  if (status === 'canceled' || status === 'rejected' || status === 'expired') return 'destructive' as const
  if (status === 'accepted' || status === 'converted_to_order') return 'outline' as const
  return 'default' as const
}

export default function QuoteDetailClient({ rfq, quote, events, attachments = [] }: Props) {
  const router = useRouter()
  const [showCancel, setShowCancel] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const st = rfqStatusLabel(rfq.status)
  const editable = canEditRfq(rfq)

  const handleCancel = async () => {
    setCanceling(true)
    try {
      await cancelQuoteRequest(rfq.id)
      toast.success('견적 요청이 취소되었습니다.')
      setShowCancel(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '취소 실패')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{rfq.rfq_no}</h1>
            <Badge variant={statusVariant(rfq.status)}>{st.label}</Badge>
          </div>
          <p className="text-sm text-zinc-600 mt-1">{rfq.title}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            제출: {formatDateTime(rfq.submitted_at)}
          </p>
        </div>

        {editable && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dealer/quotes/${rfq.id}/edit`)}
            >
              <Pencil className="size-4" /> 수정
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={() => setShowCancel(true)}
            >
              <X className="size-4" /> 취소
            </Button>
          </div>
        )}
      </div>

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
          <SpecSlotInput value={rfq.spec_json} onChange={() => {}} readOnly />
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

      {/* 첨부파일 (비공개 버킷 signed URL) */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">첨부파일</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {attachments.map((att, i) => (
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
                    <span className="text-sm text-zinc-400">{att.name} (열람 불가)</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 견적서 섹션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">견적서</CardTitle>
            {quote && (
              <Badge variant="secondary" className="text-xs">
                {quoteStatusLabel(quote.status).label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rfq.status === 'submitted' ? (
            <div className="flex items-center gap-3 py-4 text-sm text-zinc-500">
              <Mail className="size-5 text-blue-500" />
              <div>
                <p className="font-medium text-zinc-700">관리자 검토 중입니다</p>
                <p className="text-xs text-zinc-400">빠른 시간 내 회신드리겠습니다.</p>
              </div>
            </div>
          ) : rfq.status === 'canceled' ? (
            <p className="py-4 text-sm text-zinc-400">취소된 견적 요청입니다.</p>
          ) : quote ? (
            <div className="space-y-4">
              {/* 제안 사양 */}
              {quote.spec_json && (
                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-2">제안 사양</p>
                  <SpecSlotInput value={quote.spec_json} onChange={() => {}} readOnly />
                </div>
              )}
              {quote.proposed_spec && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium text-zinc-700">추가 설명</p>
                  <p className="text-sm text-zinc-600 mt-1 whitespace-pre-wrap">{quote.proposed_spec}</p>
                </div>
              )}

              {/* 가격 */}
              <div className="rounded-lg bg-blue-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">대당 단가</span>
                  <span className="font-medium">{formatKRW(quote.unit_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">수량</span>
                  <span>{quote.quantity}대</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-blue-200 font-semibold">
                  <span>합계 {quote.vat_included ? '(VAT 포함)' : '(VAT 별도)'}</span>
                  <span className="text-blue-700">{formatKRW(quote.total_amount)}</span>
                </div>
              </div>

              {/* 납기 / 유효기한 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">납기:</span>{' '}
                  <span>{quote.lead_time_days}영업일</span>
                </div>
                <div>
                  <span className="text-zinc-500">유효기한:</span>{' '}
                  <span>{formatDate(quote.valid_until)}</span>
                </div>
              </div>

              {quote.sent_at && (
                <p className="text-xs text-zinc-400">
                  발송일: {formatDateTime(quote.sent_at)}
                </p>
              )}
            </div>
          ) : (
            <p className="py-4 text-sm text-zinc-400">아직 견적서가 도착하지 않았습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 수락/거절 액션 패널 */}
      {quote && (
        <QuoteActionPanel rfq={rfq} quote={quote} events={events} />
      )}

      {/* 처리 이력 */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">처리 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <RfqTimeline events={events} showInternal={false} />
          </CardContent>
        </Card>
      )}

      {/* 취소 확인 다이얼로그 */}
      <AlertDialog open={showCancel} onOpenChange={(v) => { if (!v) setShowCancel(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>견적 요청 취소</AlertDialogTitle>
            <AlertDialogDescription>
              {rfq.rfq_no} 견적 요청을 취소하시겠습니까? 취소 후에는 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)} disabled={canceling}>
              아니오
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={canceling}>
              {canceling ? '취소 중...' : '견적 요청 취소'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
