'use client'

/**
 * 거래처 리퍼 부품 상세 (클라이언트 컴포넌트)
 * 이미지 갤러리 + 장바구니 담기 + 부품 정보
 */
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShoppingCart, Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatKRW, partTypeLabel, conditionGradeLabel, discountRate } from '@/lib/utils/format'
import { addRefurbPartToCart } from '@/app/(dealer)/dealer/(protected)/cart/actions'
import type { RefurbPart } from '@/types/database'

interface Props {
  part: RefurbPart
}

// 등급 색상 → Badge 클래스
const GRADE_BADGE: Record<string, string> = {
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  gray: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

export default function RefurbDetailClient({ part }: Props) {
  const router = useRouter()
  const [selectedImg, setSelectedImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)

  const grade = conditionGradeLabel(part.condition_grade)
  const discount = discountRate(part.market_price, part.sale_price)
  const isOutOfStock = part.stock_quantity === 0
  const thumbnails = part.thumbnail_urls ?? []

  const handleAdd = async () => {
    setAdding(true)
    try {
      await addRefurbPartToCart(part.id, qty)
      toast.success(`${part.name} ${qty}개를 장바구니에 담았습니다.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '실패')
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
                alt={part.name}
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
            <p className="text-sm text-zinc-400 mb-1">{part.sku}</p>
            <h1 className="text-2xl font-bold text-zinc-900">{part.name}</h1>
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <Badge variant="outline" className={cn(GRADE_BADGE[grade.color])}>
                {grade.label}
              </Badge>
              <Badge variant="secondary">{partTypeLabel(part.part_type)}</Badge>
            </div>
            {grade.desc && <p className="text-sm text-zinc-500 mt-2">{grade.desc}</p>}
          </div>

          {part.manufacturer && (
            <div className="flex gap-3 text-sm">
              <span className="text-zinc-500">제조사:</span>
              <span className="text-zinc-900">{part.manufacturer}</span>
            </div>
          )}

          {part.spec_summary && (
            <p className="text-sm text-zinc-600">{part.spec_summary}</p>
          )}

          {/* 가격 */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-zinc-900">{formatKRW(part.sale_price)}</p>
              {discount !== null && (
                <Badge variant="destructive">{discount}%</Badge>
              )}
            </div>
            {part.market_price !== null && discount !== null && (
              <p className="text-sm text-zinc-400 line-through">{formatKRW(part.market_price)}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex gap-3 text-sm">
              <span className="text-zinc-500">자체보증:</span>
              <span>자체보증 {part.warranty_months}개월</span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-zinc-500">재고:</span>
              {isOutOfStock ? (
                <Badge variant="destructive">품절</Badge>
              ) : (
                <span>재고 {part.stock_quantity}개</span>
              )}
            </div>
          </div>

          {/* 수량 + 버튼 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">수량:</span>
              <div className="flex items-center border rounded-lg">
                <Button variant="ghost" size="sm" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}>
                  <Minus className="size-4" />
                </Button>
                <span className="w-12 text-center font-medium">{qty}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQty(Math.min(part.stock_quantity, qty + 1))}
                  disabled={qty >= part.stock_quantity}
                >
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
                  await handleAdd()
                  router.push('/dealer/cart')
                }}
              >
                바로 발주
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 상세 설명 */}
      {part.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">상세 설명</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 whitespace-pre-wrap">{part.description}</p>
          </CardContent>
        </Card>
      )}

      {/* 상세 이미지 */}
      {part.detail_image_url && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">상세 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <Image
              src={part.detail_image_url}
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
