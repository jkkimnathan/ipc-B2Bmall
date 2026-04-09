'use client'

/**
 * 관리자 발주 목록 필터 컴포넌트
 * 상태 탭, 검색, 기간, 정렬을 처리한다.
 */
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// 상태 탭 정의
const STATUS_TABS = [
  { value: '', label: '전체' },
  { value: 'submitted', label: '접수대기' },
  { value: 'approved', label: '승인완료' },
  { value: 'in_production', label: '생산중' },
  { value: 'shipped', label: '출고완료' },
  { value: 'completed', label: '거래완료' },
  { value: 'canceled_rejected', label: '취소/반려' },
] as const

interface Props {
  submittedCount: number
}

export default function AdminOrderFilters({ submittedCount }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') ?? ''
  const currentQ = searchParams.get('q') ?? ''
  const currentPeriod = searchParams.get('period') ?? ''
  const currentSort = searchParams.get('sort') ?? 'newest'

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      router.push(`/admin/orders?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="space-y-4">
      {/* 상태 탭 */}
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

      {/* 검색 + 기간 + 정렬 */}
      <div className="flex flex-wrap gap-3">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            placeholder="발주번호 / 거래처 / 담당자 검색"
            defaultValue={currentQ}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateParams({ q: (e.target as HTMLInputElement).value })
              }
            }}
          />
        </div>

        {/* 기간 */}
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

        {/* 정렬 */}
        <Select
          value={currentSort}
          onValueChange={(v) => updateParams({ sort: v ?? 'newest' })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">최신순</SelectItem>
            <SelectItem value="oldest">오래된순</SelectItem>
            <SelectItem value="ship_date">희망납기 가까운순</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
