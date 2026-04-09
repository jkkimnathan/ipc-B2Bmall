/**
 * 거래처 인증/권한 체크 유틸리티
 *
 * 거래처 사용자 식별 방식: Supabase Auth user → dealer_users.auth_user_id 매칭
 * 서버 컴포넌트 및 서버 액션에서 사용.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { Dealer, DealerUser } from '@/types/database'

/** 현재 로그인한 거래처 사용자 정보 */
export interface DealerSession {
  authUser: User
  dealerUser: DealerUser
  dealer: Dealer
}

/**
 * 현재 거래처 세션 조회 (서버 컴포넌트용)
 *
 * 조건:
 * 1. Supabase Auth 로그인 상태
 * 2. dealer_users에 auth_user_id로 매칭되는 행 존재
 * 3. dealer_users.is_active = true
 * 4. dealers.status = 'active'
 *
 * 위 조건 중 하나라도 실패하면 null 반환.
 */
export async function getDealerSession(): Promise<DealerSession | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return null

    // dealer_users에서 auth_user_id로 매칭 + dealers 조인
    const { data: dealerUser, error: duError } = await supabase
      .from('dealer_users')
      .select('*, dealers(*)')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    if (duError || !dealerUser) return null

    const dealer = (dealerUser as Record<string, unknown>).dealers as Dealer | null
    if (!dealer || dealer.status !== 'active') return null

    // dealers 필드 제거한 순수 dealerUser
    const { dealers: _, ...pureUser } = dealerUser as Record<string, unknown> & { dealers: unknown }

    return {
      authUser: user,
      dealerUser: pureUser as unknown as DealerUser,
      dealer,
    }
  } catch {
    return null
  }
}

/**
 * 거래처가 아니거나 비활성/정지면 /dealer/login으로 리다이렉트하는 가드
 * 서버 컴포넌트/레이아웃에서 호출하여 페이지를 보호한다.
 */
export async function requireDealer(): Promise<DealerSession> {
  const session = await getDealerSession()

  if (!session) {
    redirect('/dealer/login')
  }

  return session
}
