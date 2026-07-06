'use client'

/**
 * 거래처 리퍼 부품 카탈로그 (카드 그리드 + 필터)
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
import { formatKRW, partTypeLabel, conditionGradeLabel, discountRate } from '@/lib/utils/format'
import { addRefurbPartToCart } from '@/app/(dealer)/dealer/(protected)/cart/actions'
import type { RefurbPart, PartType, ConditionGrade } from '@/types/database'

interface Props {
  parts: RefurbPart[]
  currentType?: string
  currentQuery?: string
  currentGrade?: string
}

// 부품 종류 탭 (전체 + 11종)
const partTypes: PartType[] = ['cpu', 'gpu', 'ram', 'ssd', 'hdd', 'mb', 'psu', 'case', 'cooler', 'monitor', 'etc']
const partTypeTabs = [
  { value: '', label: '전체' },
  ...partTypes.map((t) => ({ value: t, label: partTypeLabel(t) })),
]

// 등급 필터 칩
const grades: ConditionGrade[] = ['S', 'A', 'B']
const gradeChips = [
  { value: '', label: '전체' },
  ...grades.map((g) => ({ value: g, label: g })),
]

// 등급 색상 → Badge 클래스
const GRADE_BADGE: Record<string, string> = {
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  gray: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

export default function RefurbCatalog({ parts, currentType, currentQuery, currentGrade }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentQuery ?? '')
  const [addingId, setAddingId] = useState<string | null>(null)

  const handleTypeChange = (type: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (type) params.set('part_type', type)
    else params.delete('part_type')
    router.push(`/dealer/refurb?${params.toString()}`)
  }

  const handleGradeChange = (grade: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (grade) params.set('grade', grade)
    else params.delete('grade')
    router.push(`/dealer/refurb?${params.toString()}`)
  }

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (search.trim()) params.set('q', search.trim())
    else params.delete('q')
    router.push(`/dealer/refurb?${params.toString()}`)
  }

  const handleAddToCart = async (partId: string) => {
    setAddingId(partId)
    try {
      await addRefurbPartToCart(partId, 1)
      toast.success('장바구니에 담았습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '실패')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <>
      {/* 부품 종류 탭 */}
      <div className="flex gap-1 flex-wrap">
        {partTypeTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTypeChange(tab.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
              (currentType ?? '') === tab.value
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
          placeholder="부품명 또는 SKU 검색"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="size-4" />
        </Button>
      </div>

      {/* 등급 필터 칩 */}
      <div className="flex gap-1 flex-wrap">
        {gradeChips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => handleGradeChange(chip.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
              (currentGrade ?? '') === chip.value
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      {parts.length === 0 ? (
        <p className="text-center py-12 text-sm text-zinc-400">표시할 부품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {parts.map((part) => {
            const grade = conditionGradeLabel(part.condition_grade)
            const discount = discountRate(part.market_price, part.sale_price)
            const isOutOfStock = part.stock_quantity === 0

            return (
              <Card key={part.id} className={cn('overflow-hidden', isOutOfStock && 'opacity-60')}>
                {/* 썸네일 */}
                <Link href={`/dealer/refurb/${part.id}`}>
                  <div className="aspect-[4/3] bg-zinc-100 relative">
                    {part.thumbnail_urls?.[0] ? (
                      <Image
                        src={part.thumbnail_urls[0]}
                        alt={part.name}
                        fill
                        className="object-contain p-4"
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
                  <p className="text-xs text-zinc-400">{part.sku}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={cn('text-xs', GRADE_BADGE[grade.color])}>
                      {grade.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {partTypeLabel(part.part_type)}
                    </Badge>
                  </div>
                  <Link href={`/dealer/refurb/${part.id}`} className="block">
                    <h3 className="font-semibold text-zinc-900 line-clamp-1 hover:underline">{part.name}</h3>
                  </Link>
                  {part.spec_summary && (
                    <p className="text-xs text-zinc-500 line-clamp-1">{part.spec_summary}</p>
                  )}
                  {part.manufacturer && (
                    <p className="text-xs text-zinc-400">{part.manufacturer}</p>
                  )}
                  <div className="pt-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-zinc-900">{formatKRW(part.sale_price)}</span>
                      {discount !== null && (
                        <Badge variant="destructive" className="text-xs">{discount}%</Badge>
                      )}
                    </div>
                    {part.market_price !== null && discount !== null && (
                      <p className="text-xs text-zinc-400 line-through">{formatKRW(part.market_price)}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="text-xs">품절</Badge>
                    ) : (
                      <span className="text-xs text-zinc-500">재고 {part.stock_quantity}개</span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" render={<Link href={`/dealer/refurb/${part.id}`} />}>
                      상세보기
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={isOutOfStock || addingId === part.id}
                      onClick={() => handleAddToCart(part.id)}
                    >
                      <ShoppingCart className="size-4" />
                      {addingId === part.id ? '담는 중' : '담기'}
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
