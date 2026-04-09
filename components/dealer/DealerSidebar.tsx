'use client'

/**
 * 거래처 사이드바 컴포넌트
 * 현재 경로를 감지하여 활성 메뉴를 강조 표시한다.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Monitor,
  FileText,
  Package,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  { label: '대시보드', href: '/dealer', icon: LayoutDashboard },
  { label: '표준 PC', href: '/dealer/products', icon: Monitor },
  { label: '견적 요청', href: '/dealer/quotes', icon: FileText },
  { label: '발주 내역', href: '/dealer/orders', icon: Package },
  { label: '마이페이지', href: '/dealer/mypage', icon: User },
]

export default function DealerSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-[60px] h-[calc(100vh-60px)] w-[240px] border-r bg-white">
      <nav className="flex flex-col gap-1 p-3">
        {menuItems.map((item) => {
          const isActive =
            item.href === '/dealer'
              ? pathname === '/dealer'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
