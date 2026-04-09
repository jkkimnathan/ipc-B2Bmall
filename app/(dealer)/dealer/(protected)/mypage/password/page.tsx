/**
 * 거래처 마이페이지 - 비밀번호 변경 탭
 */
import { requireDealer } from '@/lib/auth/dealer'
import MypageNav from '@/components/dealer/MypageNav'
import PasswordChangeForm from '@/components/dealer/PasswordChangeForm'

export default async function MypagePasswordPage() {
  const session = await requireDealer()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">마이페이지</h1>
        <p className="text-sm text-zinc-500 mt-1">회사 정보와 담당자를 관리합니다</p>
      </div>

      <MypageNav active="password" isPrimary={session.dealerUser.is_primary} />

      <PasswordChangeForm />
    </div>
  )
}
