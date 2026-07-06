'use client'

/**
 * 관리자 사이드바 컴포넌트
 * 현재 경로를 감지하여 활성 메뉴를 강조 표시한다.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Monitor,
  Cpu,
  Package,
  FileText,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 사이드바 메뉴 항목 정의
const menuItems = [
  { label: '대시보드', href: '/admin', icon: LayoutDashboard },
  { label: '거래처 관리', href: '/admin/dealers', icon: Users },
  { label: '표준 PC 관리', href: '/admin/products', icon: Monitor },
  { label: '리퍼 부품 관리', href: '/admin/refurb', icon: Cpu },
  { label: '발주 관리', href: '/admin/orders', icon: Package },
  { label: '견적 요청', href: '/admin/quotes', icon: FileText },
  { label: '설정', href: '/admin/settings', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-[60px] h-[calc(100vh-60px)] w-[240px] border-r bg-white">
      <nav className="flex flex-col gap-1 p-3">
        {menuItems.map((item) => {
          // 대시보드는 정확히 /admin일 때만, 나머지는 prefix 매칭
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
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
