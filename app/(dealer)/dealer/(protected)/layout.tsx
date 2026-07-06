/**
 * 거래처 보호 레이아웃 (리뉴얼 · 보수적 방향)
 *
 * ───────────────────────────────────────────────────────
 *  ▸ 적용 경로 : app/(dealer)/dealer/(protected)/layout.tsx
 *  ▸ 원본 대비 변경점
 *    - 배경을 bg-zinc-50 → bg-slate-50 으로 교체 (톤 통일)
 *    - 메인 영역에 max-w + 일관된 패딩/여백 적용
 *    - 헤더 60px · 사이드바 240px 기준은 유지
 *    - requireDealer · Supabase 호출은 전혀 건드리지 않음
 * ───────────────────────────────────────────────────────
 */
import type { Metadata } from 'next'
import { requireDealer } from '@/lib/auth/dealer'

export const metadata: Metadata = { robots: { index: false, follow: false } }
import { createClient } from '@/lib/supabase/server'
import DealerHeader from '@/components/dealer/DealerHeader'
import DealerSidebar from '@/components/dealer/DealerSidebar'

export default async function DealerProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireDealer()

  // 장바구니 카운트 조회
  const supabase = await createClient()
  const { count: cartCount } = await supabase
    .from('cart_items')
    .select('*', { count: 'exact', head: true })
    .eq('dealer_id', session.dealer.id)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <DealerHeader
        companyName={session.dealer.company_name}
        userName={session.dealerUser.name}
        userRole={session.dealerUser.role}
        cartCount={cartCount ?? 0}
      />
      <DealerSidebar />
      {/* 메인 콘텐츠: 헤더(60px) 아래, 데스크톱은 사이드바(240px) 오른쪽 */}
      <main className="mt-[60px] min-h-[calc(100vh-60px)] md:ml-[240px]">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
