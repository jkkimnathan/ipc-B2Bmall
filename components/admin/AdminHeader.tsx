'use client'

/**
 * 관리자 헤더 컴포넌트
 * 좌측: 로고, 우측: 관리자 이메일 + 로그아웃 버튼
 */
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import MobileNavDrawer from '@/components/shared/MobileNavDrawer'
import { adminMenuItems } from './adminNav'

interface AdminHeaderProps {
  email: string
}

export default function AdminHeader({ email }: AdminHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // 로그아웃 실패해도 로그인 페이지로 이동
    }
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[60px] items-center justify-between border-b bg-white px-4 shadow-sm md:px-6">
      {/* 좌측: 햄버거(모바일) + 로고 */}
      <div className="flex items-center gap-2">
        <MobileNavDrawer items={adminMenuItems} title="iPC Mall 관리자" rootHref="/admin" />
        <span className="text-base font-bold text-zinc-900 md:text-lg">iPC Mall 관리자</span>
      </div>

      {/* 우측: 관리자 정보 + 로그아웃 */}
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-zinc-500 sm:inline">{email}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="size-4" />
          로그아웃
        </Button>
      </div>
    </header>
  )
}
