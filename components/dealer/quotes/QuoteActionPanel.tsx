'use client'

/**
 * 거래처 견적 수락/거절 액션 패널
 *
 * 상태별 분기:
 * - quoted + 유효: 수락/거절 버튼
 * - quoted + 만료: 만료 안내
 * - accepted/converted_to_order: 수락 완료 + 발주서 링크
 * - rejected: 거절 + 사유
 * - expired: 만료 안내
 */
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, Package, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AcceptQuoteDialog from './AcceptQuoteDialog'
import RejectQuoteDialog from './RejectQuoteDialog'
import { formatDate } from '@/lib/utils/format'
import { isQuoteExpired, expiryLabel } from '@/lib/rfq/expiry'
import type { QuoteRequest, Quote, RfqEvent } from '@/types/database'

interface Props {
  rfq: QuoteRequest
  quote: Quote
  events: RfqEvent[]
}

export default function QuoteActionPanel({ rfq, quote, events }: Props) {
  const [showAccept, setShowAccept] = useState(false)
  const [showReject, setShowReject] = useState(false)

  const expired = isQuoteExpired(quote.valid_until)
  const expiry = expiryLabel(quote.valid_until)

  // 거절 사유 찾기
  const rejectionEvent = events.find((e) => e.event_type === 'rejected_by_dealer')
  const rejectionReason = rejectionEvent?.message ?? ''

  // 발주 전환 이벤트에서 orderId 추출
  const convertEvent = events.find((e) => e.event_type === 'converted_to_order')
  const convertedOrderId = (convertEvent?.metadata as { orderId?: string })?.orderId
    ?? quote.converted_order_id

  // quoted 상태 + 유효: 수락/거절 가능
  if (rfq.status === 'quoted' && quote.status === 'sent' && !expired) {
    return (
      <>
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">유효기한</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{formatDate(quote.valid_until)}</span>
              <Badge
                variant={expiry.color === 'yellow' ? 'outline' : 'secondary'}
                className={expiry.color === 'yellow' ? 'border-yellow-400 text-yellow-700' : ''}
              >
                {expiry.label}
              </Badge>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded bg-yellow-50 p-2 text-xs text-yellow-800">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>수락 시 발주서가 자동 생성되며, 되돌릴 수 없습니다.</span>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 text-red-600"
              onClick={() => setShowReject(true)}
            >
              <XCircle className="size-4" />
              견적 거절
            </Button>
            <Button
              className="flex-1"
              onClick={() => setShowAccept(true)}
            >
              <CheckCircle className="size-4" />
              견적 수락
            </Button>
          </div>
        </div>

        <AcceptQuoteDialog
          open={showAccept}
          onOpenChange={setShowAccept}
          rfq={rfq}
          quote={quote}
        />
        <RejectQuoteDialog
          open={showReject}
          onOpenChange={setShowReject}
          rfqId={rfq.id}
        />
      </>
    )
  }

  // quoted + 만료
  if ((rfq.status === 'quoted' || rfq.status === 'expired') && (expired || quote.status === 'expired')) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-700">
          <Clock className="size-5" />
          <span className="font-medium">견적서가 만료되었습니다</span>
        </div>
        <p className="mt-2 text-sm text-red-600">
          필요 시 새 견적 요청을 제출해주세요.
        </p>
      </div>
    )
  }

  // accepted / converted_to_order
  if (rfq.status === 'accepted' || rfq.status === 'converted_to_order' || quote.status === 'accepted') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-700">
          <Package className="size-5" />
          <span className="font-medium">발주 전환 완료</span>
        </div>
        {convertedOrderId && (
          <Link
            href={`/dealer/orders/${convertedOrderId}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            발주서 보기 →
          </Link>
        )}
      </div>
    )
  }

  // rejected
  if (rfq.status === 'rejected' || quote.status === 'rejected') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-red-700">
          <XCircle className="size-5" />
          <span className="font-medium">거절됨</span>
        </div>
        {rejectionReason && (
          <p className="text-sm text-red-600">사유: {rejectionReason}</p>
        )}
      </div>
    )
  }

  return null
}
