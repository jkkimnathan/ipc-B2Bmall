'use client'

/**
 * 거래처 표준 PC 상세 (클라이언트 컴포넌트)
 * 이미지 갤러리 + 장바구니 담기 + 사양 테이블
 */
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShoppingCart, Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKRW, categoryLabel, stockStatusLabel, formatPartSlot, partLabel } from '@/lib/utils/format'
import { addToCart } from '@/app/(dealer)/dealer/(protected)/cart/actions'
import type { StandardPc, StandardPcSpec } from '@/types/database'

interface Props {
  product: StandardPc
}

/** 고정 슬롯 키 순서 */
const SPEC_KEYS = ['cpu', 'mb', 'gpu', 'cooler', 'ram', 'ssd', 'hdd', 'case', 'psu', 'os', 'as'] as const

export default function ProductDetailClient({ product }: Props) {
  const router = useRouter()
  const [selectedImg, setSelectedImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)

  const spec = product.spec_json as StandardPcSpec
  const stock = stockStatusLabel(product.stock_status)
  const isOutOfStock = product.stock_status === 'out_of_stock'
  const thumbnails = product.thumbnail_urls ?? []

  /** 장바구니 담기. 성공 여부를 반환한다 (바로 발주 시 실패하면 이동하지 않기 위함). */
  const handleAdd = async (): Promise<boolean> => {
    setAdding(true)
    try {
      await addToCart(product.id, qty)
      toast.success(`${product.name} ${qty}대를 장바구니에 담았습니다.`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '실패')
      return false
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* 상단: 이미지 + 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 좌측: 이미지 갤러리 */}
        <div className="space-y-3">
          <div className="aspect-[4/3] bg-zinc-100 rounded-lg relative overflow-hidden">
            {thumbnails[selectedImg] ? (
              <Image
                src={thumbnails[selectedImg]}
                alt={product.name}
                fill
                className="object-contain p-4"
                sizes="50vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-300">이미지 없음</div>
            )}
          </div>
          {thumbnails.length > 1 && (
            <div className="flex gap-2">
              {thumbnails.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`relative w-20 h-16 rounded border-2 overflow-hidden bg-zinc-50 ${
                    selectedImg === i ? 'border-zinc-900' : 'border-zinc-200'
                  }`}
                >
                  <Image src={url} alt="" fill className="object-contain p-1" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 우측: 정보 */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-zinc-400 mb-1">{product.sku}</p>
            <h1 className="text-2xl font-bold text-zinc-900">{product.name}</h1>
            <Badge variant="secondary" className="mt-2">{categoryLabel(product.category)}</Badge>
          </div>

          <div className="space-y-2">
            <p className="text-3xl font-bold text-zinc-900">{formatKRW(product.sale_price)}</p>
            <div className="flex gap-3 text-sm">
              <span className="text-zinc-500">재고:</span>
              <Badge variant={isOutOfStock ? 'destructive' : 'outline'}>{stock.label}</Badge>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-zinc-500">납기:</span>
              <span>영업일 {product.lead_time_days}일</span>
            </div>
          </div>

          {product.description && (
            <p className="text-sm text-zinc-600">{product.description}</p>
          )}

          {/* 수량 + 버튼 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">수량:</span>
              <div className="flex items-center border rounded-lg">
                <Button variant="ghost" size="sm" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}>
                  <Minus className="size-4" />
                </Button>
                <span className="w-12 text-center font-medium">{qty}</span>
                <Button variant="ghost" size="sm" onClick={() => setQty(qty + 1)}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                disabled={isOutOfStock || adding}
                onClick={handleAdd}
              >
                <ShoppingCart className="size-5" />
                {adding ? '담는 중...' : '장바구니 담기'}
              </Button>
              <Button
                size="lg"
                className="flex-1"
                disabled={isOutOfStock || adding}
                onClick={async () => {
                  const ok = await handleAdd()
                  if (ok) router.push('/dealer/cart')
                }}
              >
                바로 발주
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 사양 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">사양</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {SPEC_KEYS.map((key) => {
              const slot = spec[key]
              if (!slot?.name) return null
              return (
                <div key={key} className="flex py-2.5 text-sm">
                  <span className="w-28 shrink-0 text-zinc-500 font-medium">{partLabel(key)}</span>
                  <span className="text-zinc-900">{formatPartSlot(slot)}</span>
                </div>
              )
            })}
            {spec.etc?.map((item, i) => (
              <div key={`etc-${i}`} className="flex py-2.5 text-sm">
                <span className="w-28 shrink-0 text-zinc-500 font-medium">{item.label || 'ETC'}</span>
                <span className="text-zinc-900">{formatPartSlot(item)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 상세 이미지 */}
      {product.detail_image_url && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">상세 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <Image
              src={product.detail_image_url}
              alt="상세 정보"
              width={1200}
              height={800}
              className="w-full rounded-lg"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
