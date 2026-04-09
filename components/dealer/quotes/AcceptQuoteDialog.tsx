'use client'

/**
 * 견적 수락 확인 다이얼로그
 * 수락 시 발주서가 자동 생성됨을 안내
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { formatKRW, formatAddress } from '@/lib/utils/format'
import { acceptQuote } from '@/app/(dealer)/dealer/(protected)/quotes/actions'
import type { QuoteRequest, Quote } from '@/types/database'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  rfq: QuoteRequest
  quote: Quote
}

export default function AcceptQuoteDialog({ open, onOpenChange, rfq, quote }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const handleAccept = () => {
    startTransition(async () => {
      try {
        const { orderNo } = await acceptQuote(rfq.id)
        toast.success(`견적이 수락되었고 발주서 ${orderNo}가 생성되었습니다.`)
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '수락 실패')
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>견적을 수락하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">견적 수락 확인</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm">
          <p>수락 시 다음이 진행됩니다:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>발주서가 자동으로 생성됩니다</li>
            <li>배송지는 견적 요청 시 선택하신 주소로 설정됩니다</li>
            <li>발주서는 관리자의 승인 후 생산/출고 절차가 진행됩니다</li>
          </ul>
          <p className="font-medium text-red-600">수락 후에는 되돌릴 수 없습니다.</p>
        </div>

        {/* 금액 요약 */}
        <div className="rounded-lg bg-blue-50 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">단가</span>
            <span>{formatKRW(quote.unit_price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">수량</span>
            <span>{quote.quantity}대</span>
          </div>
          <div className="flex justify-between font-semibold pt-1 border-t border-blue-200">
            <span>합계 {quote.vat_included ? '(VAT 포함)' : '(VAT 별도)'}</span>
            <span className="text-blue-700">{formatKRW(quote.total_amount)}</span>
          </div>
        </div>

        {/* 배송지 재확인 */}
        {rfq.shipping_address && (
          <div className="rounded-lg bg-zinc-50 p-3 text-sm space-y-1">
            <p className="font-medium text-zinc-700">배송지</p>
            {rfq.shipping_label && <p>{rfq.shipping_label}</p>}
            <p className="text-zinc-500">
              {rfq.shipping_recipient} / {rfq.shipping_phone}
            </p>
            <p className="text-zinc-500">
              {formatAddress({
                postal_code: rfq.shipping_postal_code,
                address: rfq.shipping_address!,
                address_detail: rfq.shipping_address_detail,
              })}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            취소
          </Button>
          <Button onClick={handleAccept} disabled={pending}>
            {pending ? '처리 중...' : '수락 및 발주 생성'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
