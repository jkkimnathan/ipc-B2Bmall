'use client'

/**
 * 발주 수정 클라이언트 컴포넌트
 * 수량 변경, 품목 삭제, 배송지 변경, 메모 변경 가능.
 * 품목 추가는 불가 (취소 후 재발주).
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Trash2, Minus, Plus, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatKRW, formatAddress, getEditableMinutesLeft } from '@/lib/utils/format'
import { updateOrder } from '@/app/(dealer)/dealer/(protected)/orders/actions'
import type { Order, OrderItem, DealerAddress } from '@/types/database'

interface Props {
  order: Order
  items: OrderItem[]
  addresses: DealerAddress[]
}

interface EditItem {
  id: string
  pcId: string | null
  pcName: string
  unitPrice: number
  quantity: number
}

export default function OrderEditClient({ order, items, addresses }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [editItems, setEditItems] = useState<EditItem[]>(
    items.map((i) => ({
      id: i.id,
      pcId: i.standard_pc_id,
      pcName: i.pc_name_snapshot,
      unitPrice: i.unit_price_snapshot,
      quantity: i.quantity,
    }))
  )
  const [addressId, setAddressId] = useState(order.shipping_address_id ?? '')
  const [desiredShipDate, setDesiredShipDate] = useState(order.desired_ship_date ?? '')
  const [dealerMemo, setDealerMemo] = useState(order.dealer_memo ?? '')

  const minutesLeft = getEditableMinutesLeft(order.submitted_at)
  const total = editItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const selectedAddress = addresses.find((a) => a.id === addressId)
  const today = new Date().toISOString().slice(0, 10)

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return
    setEditItems((prev) => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item))
  }

  const removeItem = (idx: number) => {
    if (editItems.length <= 1) { toast.error('최소 1개 품목이 필요합니다.'); return }
    setEditItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!addressId) { toast.error('배송지를 선택해주세요.'); return }
    if (editItems.length === 0) { toast.error('최소 1개 품목이 필요합니다.'); return }

    setSaving(true)
    try {
      const fd = new FormData()
      fd.set('address_id', addressId)
      fd.set('desired_ship_date', desiredShipDate)
      fd.set('dealer_memo', dealerMemo)
      fd.set('items', JSON.stringify(editItems))

      await updateOrder(order.id, fd)
      toast.success('발주가 수정되었습니다.')
      router.push(`/dealer/orders/${order.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '수정 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{order.order_no} 수정</h1>
        <p className="text-sm text-zinc-500 mt-1">수량 변경, 배송지 변경이 가능합니다. (품목 추가는 불가)</p>
      </div>

      {minutesLeft > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 flex items-start gap-2">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <span>수정 가능 시간이 {minutesLeft}분 남았습니다.</span>
        </div>
      )}

      {/* 품목 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">발주 품목</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-4 py-2 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-900">{item.pcName}</p>
                <p className="text-xs text-zinc-400">단가: {formatKRW(item.unitPrice)}</p>
              </div>
              <div className="flex items-center border rounded-lg">
                <Button variant="ghost" size="sm" onClick={() => updateQty(idx, item.quantity - 1)} disabled={item.quantity <= 1}>
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <Button variant="ghost" size="sm" onClick={() => updateQty(idx, item.quantity + 1)}>
                  <Plus className="size-3" />
                </Button>
              </div>
              <span className="w-28 text-right font-medium">{formatKRW(item.unitPrice * item.quantity)}</span>
              <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                <Trash2 className="size-4 text-zinc-400" />
              </Button>
            </div>
          ))}
          <div className="flex justify-end pt-3 border-t text-lg font-bold">
            합계: {formatKRW(total)}
          </div>
        </CardContent>
      </Card>

      {/* 배송지 */}
      <Card>
        <CardHeader><CardTitle className="text-base">배송지</CardTitle></CardHeader>
        <CardContent className="space-y-3">
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
              <p>{selectedAddress.recipient_name} / {selectedAddress.phone}</p>
              <p className="text-zinc-500">{formatAddress(selectedAddress)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 희망 납기 */}
      <Card>
        <CardHeader><CardTitle className="text-base">희망 납기</CardTitle></CardHeader>
        <CardContent>
          <Input type="date" value={desiredShipDate} onChange={(e) => setDesiredShipDate(e.target.value)} min={today} className="max-w-xs" />
        </CardContent>
      </Card>

      {/* 요청사항 */}
      <Card>
        <CardHeader><CardTitle className="text-base">요청사항</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={dealerMemo} onChange={(e) => setDealerMemo(e.target.value)} rows={3} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>취소</Button>
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '수정사항 저장'}
        </Button>
      </div>
    </div>
  )
}
