'use client'

/**
 * 모바일 네비게이션 드로어 (md 미만에서만 노출)
 * 헤더에 햄버거 버튼을 렌더링하고, 클릭 시 좌측 슬라이드 메뉴를 연다.
 * 관리자/거래처 사이드바 메뉴를 공용 데이터로 받아 동일 항목을 표시한다.
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface Props {
  items: NavItem[]
  title: string
  /** 정확 매칭으로 활성 처리할 최상위 경로 (예: '/admin', '/dealer') */
  rootHref: string
}

export default function MobileNavDrawer({ items, title, rootHref }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // 경로 변경 시 자동 닫기
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // 열렸을 때 배경 스크롤 잠금
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        className="flex size-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 md:hidden"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="메뉴 닫기"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[264px] max-w-[80vw] flex-col bg-white shadow-xl">
            <div className="flex h-[60px] items-center justify-between border-b px-4">
              <span className="text-base font-bold text-zinc-900">{title}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="flex size-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-0.5 overflow-y-auto p-3">
              {items.map((item) => {
                const isActive =
                  item.href === rootHref
                    ? pathname === rootHref
                    : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                    )}
                  >
                    <item.icon className={cn('size-[18px] shrink-0', isActive ? 'text-blue-600' : 'text-zinc-400')} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
