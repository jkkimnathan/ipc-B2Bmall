'use client'

/**
 * 거래처 표준 PC 카탈로그 (카드 그리드 + 필터)
 */
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ShoppingCart, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatKRW, categoryLabel, stockStatusLabel, formatPartSlot } from '@/lib/utils/format'
import { addToCart } from '@/app/(dealer)/dealer/(protected)/cart/actions'
import type { StandardPc, StandardPcSpec } from '@/types/database'

interface Props {
  products: StandardPc[]
  currentCategory?: string
  currentQuery?: string
}

// 카테고리 탭
const categoryTabs = [
  { value: '', label: '전체' },
  { value: 'business', label: 'iPC Business' },
  { value: 'pro', label: 'iPC Pro' },
  { value: 'master', label: 'iPC Master' },
]

/** 사양 요약 한 줄 (CPU / RAM / GPU) */
function specSummary(spec: StandardPcSpec): string {
  const parts: string[] = []
  if (spec.cpu?.name) parts.push(formatPartSlot(spec.cpu))
  if (spec.ram?.name) parts.push(formatPartSlot(spec.ram))
  if (spec.gpu?.name) parts.push(formatPartSlot(spec.gpu))
  return parts.join(' / ') || '—'
}

export default function ProductCatalog({ products, currentCategory, currentQuery }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentQuery ?? '')
  const [addingId, setAddingId] = useState<string | null>(null)

  const handleCategoryChange = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cat) params.set('category', cat)
    else params.delete('category')
    router.push(`/dealer/products?${params.toString()}`)
  }

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (search.trim()) params.set('q', search.trim())
    else params.delete('q')
    router.push(`/dealer/products?${params.toString()}`)
  }

  const handleAddToCart = async (pcId: string) => {
    setAddingId(pcId)
    try {
      await addToCart(pcId, 1)
      toast.success('장바구니에 담았습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '실패')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <>
      {/* 카테고리 탭 */}
      <div className="flex gap-1 flex-wrap">
        {categoryTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleCategoryChange(tab.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
              (currentCategory ?? '') === tab.value
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="flex gap-2 max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="PC명 또는 SKU 검색"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="size-4" />
        </Button>
      </div>

      {/* 카드 그리드 */}
      {products.length === 0 ? (
        <p className="text-center py-12 text-sm text-zinc-400">표시할 제품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((pc) => {
            const stock = stockStatusLabel(pc.stock_status)
            const isOutOfStock = pc.stock_status === 'out_of_stock'

            return (
              <Card key={pc.id} className={cn('overflow-hidden', isOutOfStock && 'opacity-60')}>
                {/* 썸네일 */}
                <Link href={`/dealer/products/${pc.id}`}>
                  <div className="aspect-[4/3] bg-zinc-100 relative">
                    {pc.thumbnail_urls?.[0] ? (
                      <Image
                        src={pc.thumbnail_urls[0]}
                        alt={pc.name}
                        fill
                        className="object-cover"
                        sizes="(max-width:768px) 100vw, 25vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-300 text-sm">
                        이미지 없음
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs text-zinc-400">{pc.sku}</p>
                  <Link href={`/dealer/products/${pc.id}`} className="block">
                    <h3 className="font-semibold text-zinc-900 line-clamp-1 hover:underline">{pc.name}</h3>
                  </Link>
                  <Badge variant="secondary" className="text-xs">
                    {categoryLabel(pc.category)}
                  </Badge>
                  <p className="text-xs text-zinc-500 line-clamp-1">
                    {specSummary(pc.spec_json)}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-lg font-bold text-zinc-900">{formatKRW(pc.sale_price)}</span>
                    <Badge variant={isOutOfStock ? 'destructive' : 'outline'} className="text-xs">
                      {stock.label}
                    </Badge>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" render={<Link href={`/dealer/products/${pc.id}`} />}>
                      상세보기
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={isOutOfStock || addingId === pc.id}
                      onClick={() => handleAddToCart(pc.id)}
                    >
                      <ShoppingCart className="size-4" />
                      {addingId === pc.id ? '담는 중' : '담기'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
