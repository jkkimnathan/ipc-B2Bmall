'use client'

/**
 * 거래처 발주 상세 클라이언트 컴포넌트
 * 상세 조회 + 수정/취소 + 진행 타임라인
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import {
  formatKRW, formatDateTime, formatDate, formatAddress,
  orderStatusLabel, canEditOrder, getEditableMinutesLeft,
} from '@/lib/utils/format'
import { cancelOrder } from '@/app/(dealer)/dealer/(protected)/orders/actions'
import OrderTimeline from '@/components/admin/orders/OrderTimeline'
import type { Order, OrderItem, DealerAddress, OrderEvent } from '@/types/database'

interface Props {
  order: Order
  items: OrderItem[]
  addresses: DealerAddress[]
  events?: OrderEvent[]
}

// 진행 단계
const STEPS = [
  { status: 'submitted', label: '접수대기' },
  { status: 'approved', label: '승인완료' },
  { status: 'in_production', label: '생산중' },
  { status: 'shipped', label: '출고완료' },
  { status: 'completed', label: '거래완료' },
]

function getStepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.status === status)
  return idx >= 0 ? idx : -1
}

export default function OrderDetailClient({ order, items, addresses, events }: Props) {
  const router = useRouter()
  const [showCancel, setShowCancel] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const st = orderStatusLabel(order.status)
  const editable = canEditOrder(order)
  const minutesLeft = getEditableMinutesLeft(order.submitted_at)
  const currentStep = getStepIndex(order.status)
  const isCanceled = order.status === 'canceled'
  const isRejected = order.status === 'rejected'

  const handleCancel = async () => {
    setCanceling(true)
    try {
      await cancelOrder(order.id)
      toast.success('발주가 취소되었습니다.')
      setShowCancel(false)
      router.push('/dealer/orders')
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
            <h1 className="text-2xl font-bold text-zinc-900">{order.order_no}</h1>
            <Badge variant={isCanceled || isRejected ? 'destructive' : 'default'}>
              {st.label}
            </Badge>
            {items.some((item) => item.source_type === 'quote') && (
              <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                견적 기반 발주
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-500 mt-1">제출: {formatDateTime(order.submitted_at)}</p>
        </div>

        {editable && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dealer/orders/${order.id}/edit`)}
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

      {/* 수정 가능 시간 안내 */}
      {editable && minutesLeft > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
          발주 후 {minutesLeft}분 내 수정/취소 가능합니다.
        </div>
      )}

      {/* 품목 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">발주 품목</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium text-zinc-900">
                  {item.pc_name_snapshot} <span className="text-zinc-400 text-xs">x {item.quantity}</span>
                </p>
                <p className="text-xs text-zinc-400">단가: {formatKRW(item.unit_price_snapshot)}</p>
                {item.source_type === 'quote' && (
                  <p className="text-xs text-purple-500">견적 기반 항목</p>
                )}
              </div>
              <span className="font-medium">{formatKRW(item.subtotal)}</span>
            </div>
          ))}
          <div className="flex justify-end pt-3 border-t text-lg font-bold">
            합계: {formatKRW(order.total_amount)}
          </div>
        </CardContent>
      </Card>

      {/* 배송지 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">배송지</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {order.shipping_label && (
            <p className="font-medium">{order.shipping_label}</p>
          )}
          <p>{order.shipping_recipient} / {order.shipping_phone}</p>
          {order.shipping_address && (
            <p className="text-zinc-500">
              {formatAddress({
                postal_code: order.shipping_postal_code,
                address: order.shipping_address,
                address_detail: order.shipping_address_detail,
              })}
            </p>
          )}
          {order.shipping_memo && <p className="text-xs text-zinc-400">메모: {order.shipping_memo}</p>}
        </CardContent>
      </Card>

      {/* 희망 납기 / 요청사항 */}
      {(order.desired_ship_date || order.dealer_memo) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">희망 납기 / 요청사항</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {order.desired_ship_date && (
              <div className="flex gap-2">
                <span className="text-zinc-500">희망 납기:</span>
                <span>{formatDate(order.desired_ship_date)}</span>
              </div>
            )}
            {order.dealer_memo && (
              <div>
                <span className="text-zinc-500">요청사항:</span>
                <p className="mt-1 whitespace-pre-wrap">{order.dealer_memo}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 진행 상황 (단계 표시) */}
      {!isCanceled && !isRejected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">진행 상황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {STEPS.map((step, i) => {
                const done = i <= currentStep
                return (
                  <div key={step.status} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${done ? 'bg-blue-600' : 'bg-zinc-200'}`} />
                    <span className={`text-xs ${done ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                      {step.label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className={`w-6 h-0.5 ${i < currentStep ? 'bg-blue-600' : 'bg-zinc-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
            {order.expected_ship_date && (
              <p className="text-sm text-zinc-600 mt-4">
                <span className="text-zinc-400">출고 예정일:</span> {formatDate(order.expected_ship_date)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 이력 타임라인 */}
      {events && events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">이력</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline events={events} showInternal={false} />
          </CardContent>
        </Card>
      )}

      {/* 취소 확인 다이얼로그 */}
      <AlertDialog open={showCancel} onOpenChange={(v) => { if (!v) setShowCancel(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>발주 취소</AlertDialogTitle>
            <AlertDialogDescription>
              {order.order_no} 발주를 취소하시겠습니까? 취소 후에는 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)} disabled={canceling}>아니오</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={canceling}>
              {canceling ? '취소 중...' : '발주 취소'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
