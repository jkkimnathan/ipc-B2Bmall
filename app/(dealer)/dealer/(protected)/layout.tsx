/**
 * 거래처 보호 레이아웃
 *
 * 사이드바 + 헤더가 포함된 거래처 전용 레이아웃.
 * requireDealer()로 인증을 확인하여 비로그인/비활성/비거래처 접근을 차단.
 * /dealer/login, /dealer/signup은 이 레이아웃 바깥에 있어 영향받지 않는다.
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
    <div className="min-h-screen bg-zinc-50">
      <DealerHeader
        companyName={session.dealer.company_name}
        userName={session.dealerUser.name}
        userRole={session.dealerUser.role}
        cartCount={cartCount ?? 0}
      />
      <DealerSidebar />
      {/* 메인 콘텐츠: 헤더(60px) 아래, 사이드바(240px) 오른쪽 */}
      <main className="ml-[240px] mt-[60px] p-6">
        {children}
      </main>
    </div>
  )
}
