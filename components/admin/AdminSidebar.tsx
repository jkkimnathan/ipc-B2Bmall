'use client'

/**
 * 관리자 사이드바 컴포넌트
 * 현재 경로를 감지하여 활성 메뉴를 강조 표시한다.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { adminMenuItems as menuItems } from './adminNav'

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-[60px] hidden h-[calc(100vh-60px)] w-[240px] border-r bg-white md:block">
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
