'use client'

/**
 * 거래처 헤더 컴포넌트 (리뉴얼 · 보수적 방향)
 *
 * ───────────────────────────────────────────────────────
 *  ▸ 적용 경로 : components/dealer/DealerHeader.tsx
 *  ▸ 원본 대비 변경점 : Tailwind 클래스와 JSX 마크업만 리디자인.
 *    props · import · 핸들러 · Supabase 호출은 전혀 건드리지 않음.
 *  ▸ 디자인 토큰
 *    - 배경   : bg-white / 하단 hairline border-slate-200
 *    - 텍스트 : text-slate-900 (주) · text-slate-500 (보조)
 *    - 액센트 : text-blue-700 · bg-blue-600
 *    - 둥근정도 : 로고 배지 rounded-md, 버튼 rounded-lg
 *    - 헤더 높이 60px 유지 (레이아웃이 `mt-[60px]`에 의존)
 * ───────────────────────────────────────────────────────
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
import MobileNavDrawer from '@/components/shared/MobileNavDrawer'
import { dealerMenuItems } from './dealerNav'

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
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur px-4 md:px-6">
      {/* 좌측: 햄버거(모바일) + 로고 */}
      <div className="flex items-center gap-2 md:gap-3">
        <MobileNavDrawer items={dealerMenuItems} title="iPC B2B·MALL" rootHref="/dealer" />
        <Link href="/dealer" className="flex items-baseline gap-2">
          <span className="text-[19px] font-extrabold tracking-tight text-slate-900">iPC</span>
          <span className="text-[11px] font-semibold tracking-[0.12em] text-slate-500">B2B·MALL</span>
        </Link>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500">
          거래처
        </span>
      </div>

      {/* 우측: 장바구니 + 거래처 + 사용자 드롭다운 */}
      <div className="flex items-center gap-2">
        <Link
          href="/dealer/cart"
          aria-label={`장바구니${cartCount > 0 ? ` (${cartCount}건)` : ''}`}
          className="relative flex size-9 items-center justify-center rounded-lg border border-transparent text-slate-600 transition-colors hover:border-slate-200 hover:bg-slate-50"
        >
          <ShoppingCart className="size-[18px]" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-[18px] text-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>

        <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

        <div className="hidden items-center gap-2 pr-1 sm:flex">
          <span className="text-[13px] font-medium text-slate-500">{companyName}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
            <span className="text-[13px] font-semibold text-slate-900">{userName}</span>
            {userRole && <span className="ml-1 text-[12px] font-medium text-slate-400">({userRole})</span>}
            <ChevronDown className="ml-1 size-3 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
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
