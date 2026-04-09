'use client'

/**
 * 관리자 견적 요청 목록 필터 컴포넌트
 */
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const STATUS_TABS = [
  { value: '', label: '전체' },
  { value: 'submitted', label: '회신대기' },
  { value: 'quoted', label: '견적발송' },
  { value: 'accepted', label: '수락' },
  { value: 'done', label: '완료' },
] as const

interface Props {
  submittedCount: number
}

export default function AdminRfqFilters({ submittedCount }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') ?? ''
  const currentQ = searchParams.get('q') ?? ''
  const currentPeriod = searchParams.get('period') ?? ''

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      router.push(`/admin/quotes?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = currentStatus === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => updateParams({ status: tab.value })}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                isActive
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {tab.label}
              {tab.value === 'submitted' && submittedCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                  {submittedCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            placeholder="RFQ번호 / 제목 / 거래처 검색"
            defaultValue={currentQ}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter') updateParams({ q: (e.target as HTMLInputElement).value })
            }}
          />
        </div>

        <Select
          value={currentPeriod || 'all'}
          onValueChange={(v) => updateParams({ period: v === 'all' ? '' : (v ?? '') })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="기간" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 기간</SelectItem>
            <SelectItem value="today">오늘</SelectItem>
            <SelectItem value="7d">최근 7일</SelectItem>
            <SelectItem value="30d">최근 30일</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
