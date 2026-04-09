'use client'

/**
 * 거래처 목록 필터 (상태 탭 + 검색)
 */
import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DealerFiltersProps {
  pendingCount: number
}

const TABS = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '승인대기' },
  { value: 'active', label: '활성' },
  { value: 'suspended', label: '정지' },
]

export default function DealerFilters({ pendingCount }: DealerFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const status = searchParams.get('status') ?? 'all'
  const q = searchParams.get('q') ?? ''

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/admin/dealers?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="flex flex-col gap-3">
      {/* 상태 탭 */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => update('status', tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              status === tab.value
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900'
            )}
          >
            {tab.label}
            {tab.value === 'pending' && pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="상호 / 사업자번호 / 담당자명 검색..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => update('q', val), 300)
          }}
          className="pl-9"
        />
      </div>
    </div>
  )
}
