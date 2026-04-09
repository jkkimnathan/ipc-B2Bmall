'use client'

/**
 * 발주 내역 필터 (상태 탭 + 검색)
 */
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  currentStatus?: string
  currentQuery?: string
}

const statusTabs = [
  { value: '', label: '전체' },
  { value: 'submitted', label: '접수대기' },
  { value: 'approved', label: '승인완료' },
  { value: 'in_production', label: '생산중' },
  { value: 'shipped', label: '출고완료' },
  { value: 'completed', label: '거래완료' },
]

export default function OrderFilters({ currentStatus, currentQuery }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentQuery ?? '')

  const handleStatus = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status) params.set('status', status)
    else params.delete('status')
    router.push(`/dealer/orders?${params.toString()}`)
  }

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (search.trim()) params.set('q', search.trim())
    else params.delete('q')
    router.push(`/dealer/orders?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleStatus(tab.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
              (currentStatus ?? '') === tab.value
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 max-w-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="발주번호 검색"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="size-4" />
        </Button>
      </div>
    </div>
  )
}
