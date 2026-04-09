'use client'

/**
 * 발주서 작성 클라이언트 컴포넌트
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatKRW, formatAddress } from '@/lib/utils/format'
import { submitOrder } from '@/app/(dealer)/dealer/(protected)/checkout/actions'
import type { DealerAddress } from '@/types/database'

interface CheckoutItem {
  cartItemId: string
  pcId: string
  name: string
  sku: string
  price: number
  quantity: number
  stockStatus: string
}

interface Props {
  items: CheckoutItem[]
  addresses: DealerAddress[]
  cartItemIds: string[]
}

export default function CheckoutClient({ items, addresses, cartItemIds }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  // 기본 배송지 자동 선택
  const defaultAddr = addresses.find((a) => a.is_default)
  const [addressId, setAddressId] = useState(defaultAddr?.id ?? '')
  const [desiredShipDate, setDesiredShipDate] = useState('')
  const [dealerMemo, setDealerMemo] = useState('')

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const hasOutOfStock = items.some((i) => i.stockStatus === 'out_of_stock')
  const selectedAddress = addresses.find((a) => a.id === addressId)

  // 오늘 이후 날짜만 선택 가능
  const today = new Date().toISOString().slice(0, 10)

  const handleSubmit = async () => {
    if (!addressId) { toast.error('배송지를 선택해주세요.'); return }
    if (hasOutOfStock) { toast.error('품절 상품이 포함되어 있습니다.'); return }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.set('cart_item_ids', cartItemIds.join(','))
      fd.set('address_id', addressId)
      fd.set('desired_ship_date', desiredShipDate)
      fd.set('dealer_memo', dealerMemo)

      const result = await submitOrder(fd)
      toast.success(`발주서 ${result.orderNo}가 제출되었습니다.`)
      router.push(`/dealer/orders/${result.orderId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '발주 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">발주서 작성</h1>
        <p className="text-sm text-zinc-500 mt-1">내용을 확인하고 발주를 제출해주세요</p>
      </div>

      {/* 품목 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">발주 품목</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div key={item.cartItemId} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium text-zinc-900">{item.name} <span className="text-zinc-400 text-xs">x {item.quantity}</span></p>
                <p className="text-xs text-zinc-400">{item.sku}</p>
                {item.stockStatus === 'out_of_stock' && (
                  <Badge variant="destructive" className="text-xs mt-1">품절</Badge>
                )}
              </div>
              <span className="font-medium">{formatKRW(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-end pt-3 border-t text-lg font-bold">
            합계: {formatKRW(total)} <span className="text-sm text-zinc-400 font-normal ml-2">(VAT 포함)</span>
          </div>
        </CardContent>
      </Card>

      {/* 배송지 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">배송지</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {addresses.length === 0 ? (
            <div className="text-sm text-zinc-400 space-y-2">
              <p>등록된 배송지가 없습니다.</p>
              <Button size="sm" variant="outline" render={<Link href="/dealer/mypage/addresses" />}>
                배송지 등록하기
              </Button>
            </div>
          ) : (
            <>
              <Select value={addressId} onValueChange={(v) => setAddressId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="배송지 선택" />
                </SelectTrigger>
                <SelectContent>
                  {addresses.map((addr) => (
                    <SelectItem key={addr.id} value={addr.id}>
                      {addr.label} {addr.is_default ? '(기본)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedAddress && (
                <div className="rounded-lg bg-zinc-50 p-3 text-sm space-y-1">
                  <p className="font-medium">{selectedAddress.label}</p>
                  <p>{selectedAddress.recipient_name} / {selectedAddress.phone}</p>
                  <p className="text-zinc-500">{formatAddress(selectedAddress)}</p>
                  {selectedAddress.memo && <p className="text-xs text-zinc-400">메모: {selectedAddress.memo}</p>}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 희망 납기 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">희망 납기</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={desiredShipDate}
            onChange={(e) => setDesiredShipDate(e.target.value)}
            min={today}
            className="max-w-xs"
          />
          <p className="text-xs text-zinc-400 mt-1">선택사항 — 미입력 시 기본 납기가 적용됩니다.</p>
        </CardContent>
      </Card>

      {/* 요청사항 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">요청사항</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={dealerMemo}
            onChange={(e) => setDealerMemo(e.target.value)}
            placeholder="배송 관련 참고사항이 있으면 입력해주세요"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* 안내 + 버튼 */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 flex items-start gap-2">
        <AlertTriangle className="size-4 mt-0.5 shrink-0" />
        <span>발주서 제출 후 1시간 이내에만 수정/취소가 가능합니다.</span>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>취소</Button>
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || hasOutOfStock || !addressId}
        >
          {submitting ? '제출 중...' : '발주서 제출'}
        </Button>
      </div>
    </div>
  )
}
