import { Skeleton } from '@/components/ui/skeleton'

/**
 * 거래처 섹션 공용 로딩 스켈레톤
 * 페이지 이동 즉시 표시되어 서버 응답을 기다리는 동안 체감 속도를 높인다.
 * (레이아웃/헤더는 유지되고 콘텐츠 영역만 교체됨)
 */
export default function DealerLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="불러오는 중">
      {/* 페이지 제목 */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* 본문 블록 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}
