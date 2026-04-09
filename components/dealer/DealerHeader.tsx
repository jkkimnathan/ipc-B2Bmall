'use client'

/**
 * 거래처 헤더 컴포넌트
 * 좌측: 로고, 우측: 거래처명/담당자명 + 드롭다운 메뉴
 */
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, LogOut, User, KeyRound, ShoppingCart } from 'lucide-react'

interface DealerHeaderProps {
  companyName: string
  userName: string
  userRole: string | null
  cartCount?: number
}

export default function DealerHeader({ companyName, userName, userRole, cartCount = 0 }: DealerHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // 로그아웃 실패해도 로그인 페이지로 이동
    }
    router.push('/dealer/login')
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[60px] items-center justify-between border-b bg-white px-6 shadow-sm">
      {/* 좌측: 로고 */}
      <div className="flex items-center gap-2">
        <Link href="/dealer" className="text-lg font-bold text-zinc-900">iPC Mall</Link>
        <span className="text-xs text-zinc-400 border rounded px-1.5 py-0.5">거래처</span>
      </div>

      {/* 우측: 장바구니 + 사용자 정보 + 드롭다운 */}
      <div className="flex items-center gap-3">
        <Link href="/dealer/cart" className="relative p-2 hover:bg-zinc-100 rounded-lg transition-colors">
          <ShoppingCart className="size-5 text-zinc-600" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </Link>
        <span className="text-sm text-zinc-500">{companyName}</span>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
            {userName}
            {userRole && <span className="text-zinc-400 ml-1">({userRole})</span>}
            <ChevronDown className="size-3 ml-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push('/dealer/mypage')}>
              <User className="mr-2 size-4" />마이페이지
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dealer/mypage/password')}>
              <KeyRound className="mr-2 size-4" />비밀번호 변경
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
