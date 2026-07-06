'use client'

/**
 * 거래처 사이드바 컴포넌트 (리뉴얼 · 보수적 방향)
 *
 * ───────────────────────────────────────────────────────
 *  ▸ 적용 경로 : components/dealer/DealerSidebar.tsx
 *  ▸ 원본 대비 변경점
 *    - 메뉴 항목/아이콘/경로는 동일하게 유지
 *    - 활성 메뉴 표시를 블루 액센트 레일 + 배경 칩으로 강화
 *    - 섹션 라벨(WORKSPACE) + 하단 서포트 섹션 추가
 *    - 너비 240px · top 60px 고정 (레이아웃 의존성 유지)
 * ───────────────────────────────────────────────────────
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Monitor,
  Cpu,
  FileText,
  Package,
  User,
  LifeBuoy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  { label: '대시보드', href: '/dealer', icon: LayoutDashboard },
  { label: '표준 PC', href: '/dealer/products', icon: Monitor },
  { label: '리퍼 부품', href: '/dealer/refurb', icon: Cpu },
  { label: '견적 요청', href: '/dealer/quotes', icon: FileText },
  { label: '발주 내역', href: '/dealer/orders', icon: Package },
  { label: '마이페이지', href: '/dealer/mypage', icon: User },
]

export default function DealerSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-[60px] flex h-[calc(100vh-60px)] w-[240px] flex-col border-r border-slate-200 bg-white">
      <div className="px-4 pt-5 pb-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Workspace
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {menuItems.map((item) => {
          const isActive =
            item.href === '/dealer'
              ? pathname === '/dealer'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full transition-colors',
                  isActive ? 'bg-blue-600' : 'bg-transparent'
                )}
              />
              <item.icon
                className={cn(
                  'size-[17px] shrink-0',
                  isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* 하단 서포트 블록 */}
      <div className="mt-auto border-t border-slate-200 p-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
            <LifeBuoy className="size-4 text-blue-600" />
            기술 지원
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
            평일 09–18시 · 02-000-0000<br />
            긴급 AS 접수는 마이페이지에서
          </p>
        </div>
      </div>
    </aside>
  )
}
