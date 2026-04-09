/**
 * 거래처 마이페이지 - 담당자 관리 탭
 */
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import MypageNav from '@/components/dealer/MypageNav'
import DealerMyUserList from '@/components/dealer/DealerMyUserList'
import type { DealerUser } from '@/types/database'

export default async function MypageUsersPage() {
  const session = await requireDealer()

  // 대표 담당자가 아니면 이 페이지에 접근할 수 없음
  if (!session.dealerUser.is_primary) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">마이페이지</h1>
          <p className="text-sm text-zinc-500 mt-1">회사 정보와 담당자를 관리합니다</p>
        </div>
        <MypageNav active="users" isPrimary={false} />
        <p className="text-sm text-zinc-400 text-center py-12">
          대표 담당자만 담당자를 관리할 수 있습니다.
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: users } = await supabase
    .from('dealer_users')
    .select('*')
    .eq('dealer_id', session.dealer.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">마이페이지</h1>
        <p className="text-sm text-zinc-500 mt-1">회사 정보와 담당자를 관리합니다</p>
      </div>

      <MypageNav active="users" isPrimary={session.dealerUser.is_primary} />

      <DealerMyUserList
        users={(users ?? []) as DealerUser[]}
        currentUserId={session.dealerUser.id}
        isPrimary={session.dealerUser.is_primary}
      />
    </div>
  )
}
