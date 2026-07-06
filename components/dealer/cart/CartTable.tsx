'use client'

/**
 * 장바구니 테이블 (체크박스 + 수량 조절 + 선택 삭제)
 * 표준 PC와 리퍼 부품을 함께 표시한다 (item_type 무관 공통 렌더링).
 */
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Minus, Plus, Trash2, Cpu, Monitor } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { formatKRW } from '@/lib/utils/format'
import { updateCartItemQuantity, removeCartItem, removeCartItems } from '@/app/(dealer)/dealer/(protected)/cart/actions'

export interface CartItemRow {
  id: string
  quantity: number
  itemType: 'standard_pc' | 'refurb_part'
  product: {
    id: string
    sku: string
    name: string
    salePrice: number
    thumbnail?: string
    available: boolean
    stockLabel?: string
    maxQty?: number
    href: string
  }
}

interface Props {
  items: CartItemRow[]
}

export default function CartTable({ items }: Props) {
  const router = useRouter()
  // 구매 가능한 항목만 기본 선택
  const [selected, setSelected] = useState<Set<string>>(
    new Set(items.filter((i) => i.product.available).map((i) => i.id))
  )
  const [updating, setUpdating] = useState<string | null>(null)

  // 전체선택은 구매 가능한(선택 가능한) 항목만 대상으로 한다
  const selectableItems = items.filter((i) => i.product.available)
  const allSelected = selectableItems.length > 0 && selected.size === selectableItems.length
  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(selectableItems.map((i) => i.id)))
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

  // 선택된 항목만 합계 (품절 항목은 계산/발주 제외)
  const selectedItems = items.filter((i) => selected.has(i.id) && i.product.available)
  const total = selectedItems.reduce((sum, i) => sum + i.product.salePrice * i.quantity, 0)
  const selectedIds = selectedItems.map((i) => i.id).join(',')

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
          const p = item.product
          const subtotal = p.salePrice * item.quantity
          const atMax = p.maxQty != null && item.quantity >= p.maxQty
          const Icon = item.itemType === 'refurb_part' ? Cpu : Monitor

          return (
            <div key={item.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <Checkbox
                checked={selected.has(item.id)}
                onCheckedChange={() => toggleOne(item.id)}
                disabled={!p.available}
              />

              {/* 썸네일 */}
              <div className="hidden sm:flex size-12 shrink-0 items-center justify-center rounded border bg-zinc-50 overflow-hidden">
                {p.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnail} alt={p.name} className="size-full object-contain p-1" />
                ) : (
                  <Icon className="size-5 text-zinc-300" />
                )}
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {item.itemType === 'refurb_part' ? '리퍼부품' : '표준PC'}
                  </Badge>
                  <Link href={p.href} className="font-medium text-zinc-900 hover:underline truncate">
                    {p.name}
                  </Link>
                </div>
                <p className="text-xs text-zinc-400">{p.sku}</p>
                {!p.available && <Badge variant="destructive" className="text-xs mt-1">{p.stockLabel ?? '구매불가'}</Badge>}
                {p.available && item.itemType === 'refurb_part' && p.stockLabel && (
                  <p className="text-[11px] text-zinc-400 mt-0.5">{p.stockLabel}</p>
                )}
              </div>

              {/* 단가 */}
              <div className="hidden md:block text-sm text-zinc-500 w-28 text-right">
                {formatKRW(p.salePrice)}
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
                  disabled={updating === item.id || atMax || !p.available}
                >
                  <Plus className="size-3" />
                </Button>
              </div>

              {/* 소계 */}
              <div className="text-sm font-semibold text-zinc-900 w-24 sm:w-32 text-right">
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
      <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-6 pt-4 border-t">
        <div className="text-sm text-zinc-500">
          품목 수: <span className="font-medium text-zinc-900">{selectedItems.length}종</span>
        </div>
        <div className="text-lg font-bold text-zinc-900">
          합계: {formatKRW(total)}
        </div>
        <Button
          size="lg"
          disabled={selectedItems.length === 0}
          render={<Link href={`/dealer/checkout?items=${selectedIds}`} />}
        >
          발주서 작성 &rarr;
        </Button>
      </div>
    </>
  )
}
