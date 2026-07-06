import { Skeleton } from '@/components/ui/skeleton'

/**
 * 관리자 섹션 공용 로딩 스켈레톤
 * 페이지 이동 즉시 표시되어 서버 응답을 기다리는 동안 체감 속도를 높인다.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="불러오는 중">
      {/* 페이지 제목 */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* 필터/탭 줄 */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      {/* 테이블 */}
      <div className="space-y-2">
        <Skeleton className="h-10 rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
