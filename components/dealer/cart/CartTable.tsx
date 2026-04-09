'use client'

/**
 * 장바구니 테이블 (체크박스 + 수량 조절 + 선택 삭제)
 */
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Minus, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { formatKRW } from '@/lib/utils/format'
import { updateCartItemQuantity, removeCartItem, removeCartItems } from '@/app/(dealer)/dealer/(protected)/cart/actions'

interface CartItemRow {
  id: string
  quantity: number
  pc: {
    id: string
    sku: string
    name: string
    sale_price: number
    stock_status: string
    thumbnail_urls: string[]
  }
}

interface Props {
  items: CartItemRow[]
}

export default function CartTable({ items }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)))
  const [updating, setUpdating] = useState<string | null>(null)

  const allSelected = selected.size === items.length
  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(items.map((i) => i.id)))
  }
  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleQty = async (itemId: string, newQty: number) => {
    setUpdating(itemId)
    try {
      await updateCartItemQuantity(itemId, newQty)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '실패')
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveOne = async (itemId: string) => {
    try {
      await removeCartItem(itemId)
      setSelected((prev) => { const n = new Set(prev); n.delete(itemId); return n })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '실패')
    }
  }

  const handleRemoveSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`선택한 ${selected.size}건을 삭제하시겠습니까?`)) return
    try {
      await removeCartItems(Array.from(selected))
      setSelected(new Set())
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '실패')
    }
  }

  // 선택된 항목만 합계
  const selectedItems = items.filter((i) => selected.has(i.id))
  const total = selectedItems.reduce((sum, i) => sum + i.pc.sale_price * i.quantity, 0)
  const selectedIds = Array.from(selected).join(',')

  return (
    <>
      {/* 상단 액션 */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          <span className="text-sm">전체선택</span>
        </label>
        <Button variant="outline" size="sm" onClick={handleRemoveSelected} disabled={selected.size === 0}>
          <Trash2 className="size-4" /> 선택삭제
        </Button>
      </div>

      {/* 품목 리스트 */}
      <div className="rounded-lg border divide-y">
        {items.map((item) => {
          const isOutOfStock = item.pc.stock_status === 'out_of_stock'
          const subtotal = item.pc.sale_price * item.quantity

          return (
            <div key={item.id} className="flex items-center gap-4 p-4">
              <Checkbox
                checked={selected.has(item.id)}
                onCheckedChange={() => toggleOne(item.id)}
              />

              {/* PC 정보 */}
              <div className="flex-1 min-w-0">
                <Link href={`/dealer/products/${item.pc.id}`} className="font-medium text-zinc-900 hover:underline">
                  {item.pc.name}
                </Link>
                <p className="text-xs text-zinc-400">{item.pc.sku}</p>
                {isOutOfStock && <Badge variant="destructive" className="text-xs mt-1">재고없음</Badge>}
              </div>

              {/* 단가 */}
              <div className="text-sm text-zinc-500 w-28 text-right">
                {formatKRW(item.pc.sale_price)}
              </div>

              {/* 수량 */}
              <div className="flex items-center border rounded-lg">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => handleQty(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1 || updating === item.id}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => handleQty(item.id, item.quantity + 1)}
                  disabled={updating === item.id}
                >
                  <Plus className="size-3" />
                </Button>
              </div>

              {/* 소계 */}
              <div className="text-sm font-semibold text-zinc-900 w-32 text-right">
                {formatKRW(subtotal)}
              </div>

              {/* 삭제 */}
              <Button variant="ghost" size="sm" onClick={() => handleRemoveOne(item.id)}>
                <Trash2 className="size-4 text-zinc-400" />
              </Button>
            </div>
          )
        })}
      </div>

      {/* 하단 합계 */}
      <div className="flex items-center justify-end gap-6 pt-4 border-t">
        <div className="text-sm text-zinc-500">
          품목 수: <span className="font-medium text-zinc-900">{selectedItems.length}종</span>
        </div>
        <div className="text-lg font-bold text-zinc-900">
          합계: {formatKRW(total)}
        </div>
        <Button
          size="lg"
          disabled={selected.size === 0}
          render={<Link href={`/dealer/checkout?items=${selectedIds}`} />}
        >
          발주서 작성 &rarr;
        </Button>
      </div>
    </>
  )
}
