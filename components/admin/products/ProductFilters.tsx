'use client'

/**
 * 표준 PC 목록 필터 컴포넌트
 * 검색어, 카테고리, 활성 상태 필터를 URL searchParams으로 관리한다.
 */
import { useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

export default function ProductFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? 'all'
  const active = searchParams.get('active') ?? 'all'

  // 필터 변경 시 URL 업데이트
  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/admin/products?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 검색바 */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="PC명 또는 SKU 검색..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => update('q', val), 300)
          }}
          className="pl-9"
        />
      </div>

      {/* 카테고리 필터 */}
      <Select value={category} onValueChange={(v) => update('category', v ?? 'all')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="카테고리" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectGroup>
            <SelectLabel>iPC Business</SelectLabel>
            <SelectItem value="business-entry">Entry</SelectItem>
            <SelectItem value="business-standard">Standard</SelectItem>
            <SelectItem value="business-advance">Advance</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>iPC Pro</SelectLabel>
            <SelectItem value="pro-creator">Creator</SelectItem>
            <SelectItem value="pro-engineer">Engineer</SelectItem>
            <SelectItem value="pro-developer">Developer</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>iPC Master</SelectLabel>
            <SelectItem value="master-researcher">Researcher</SelectItem>
            <SelectItem value="master-director">Director</SelectItem>
            <SelectItem value="master-analyst">Analyst</SelectItem>
          </SelectGroup>
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
