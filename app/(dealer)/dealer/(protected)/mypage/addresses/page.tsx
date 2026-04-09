/**
 * 거래처 마이페이지 - 배송지 관리 탭
 */
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import MypageNav from '@/components/dealer/MypageNav'
import AddressListClient from '@/components/dealer/AddressListClient'
import type { DealerAddress } from '@/types/database'

export default async function MypageAddressesPage() {
  const session = await requireDealer()
  const supabase = await createClient()

  const { data: addresses } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('dealer_id', session.dealer.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">마이페이지</h1>
        <p className="text-sm text-zinc-500 mt-1">회사 정보와 담당자를 관리합니다</p>
      </div>

      <MypageNav active="addresses" isPrimary={session.dealerUser.is_primary} />

      <AddressListClient addresses={(addresses ?? []) as DealerAddress[]} />
    </div>
  )
}
