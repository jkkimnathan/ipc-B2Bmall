/**
 * 관리자 대시보드 레이아웃
 *
 * 사이드바 + 헤더가 포함된 관리자 전용 레이아웃.
 * requireAdmin()으로 인증을 확인하여 비로그인/비관리자 접근을 차단한다.
 * /admin/login은 이 레이아웃 바깥에 있어 영향받지 않는다.
 */
import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'

export const metadata: Metadata = { robots: { index: false, follow: false } }
import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 관리자 인증 확인 (비관리자는 /admin/login으로 리다이렉트됨)
  const user = await requireAdmin()

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader email={user.email ?? ''} />
      <AdminSidebar />
      {/* 메인 콘텐츠: 헤더(60px) 아래, 데스크톱은 사이드바(240px) 오른쪽 */}
      <main className="mt-[60px] p-4 md:ml-[240px] md:p-6">
        {children}
      </main>
    </div>
  )
}
