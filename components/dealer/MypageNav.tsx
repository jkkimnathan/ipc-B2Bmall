'use client'

/**
 * 마이페이지 탭 네비게이션
 */
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MypageNavProps {
  active: 'info' | 'users' | 'addresses' | 'password'
  isPrimary: boolean
}

export default function MypageNav({ active, isPrimary }: MypageNavProps) {
  const tabs = [
    { value: 'info' as const, label: '회사 정보', href: '/dealer/mypage' },
    ...(isPrimary ? [{ value: 'users' as const, label: '담당자 관리', href: '/dealer/mypage/users' }] : []),
    { value: 'addresses' as const, label: '배송지 관리', href: '/dealer/mypage/addresses' },
    { value: 'password' as const, label: '비밀번호 변경', href: '/dealer/mypage/password' },
  ]

  const tabClass = (tab: string) =>
    cn('px-4 py-2 text-sm font-medium rounded-md transition-colors',
      active === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900')

  return (
    <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
      {tabs.map((tab) => (
        <Link key={tab.value} href={tab.href} className={tabClass(tab.value)}>
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
