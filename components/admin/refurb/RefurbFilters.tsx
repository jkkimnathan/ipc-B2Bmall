'use client'

/**
 * 리퍼 부품 목록 필터 컴포넌트
 * 검색어, 부품 종류, 활성 상태 필터를 URL searchParams으로 관리한다.
 */
import { useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'
import { partTypeLabel } from '@/lib/utils/format'
import type { PartType } from '@/types/database'

const PART_TYPES: PartType[] = [
  'cpu', 'gpu', 'ram', 'ssd', 'hdd', 'mb', 'psu', 'case', 'cooler', 'monitor', 'etc',
]

export default function RefurbFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const q = searchParams.get('q') ?? ''
  const partType = searchParams.get('part_type') ?? 'all'
  const active = searchParams.get('active') ?? 'all'

  // 필터 변경 시 URL 업데이트
  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/admin/refurb?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 검색바 */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="부품명 또는 SKU 검색..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => update('q', val), 300)
          }}
          className="pl-9"
        />
      </div>

      {/* 부품 종류 필터 */}
      <Select value={partType} onValueChange={(v) => update('part_type', v ?? 'all')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="부품 종류" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          {PART_TYPES.map((type) => (
            <SelectItem key={type} value={type}>{partTypeLabel(type)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 활성 상태 필터 */}
      <Select value={active} onValueChange={(v) => update('active', v ?? 'all')}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="true">활성</SelectItem>
          <SelectItem value="false">비활성</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
