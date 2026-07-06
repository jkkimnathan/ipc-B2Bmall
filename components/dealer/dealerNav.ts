/**
 * 거래처 사이드바 메뉴 정의 (데스크톱 사이드바 + 모바일 드로어 공용)
 */
import {
  LayoutDashboard,
  Monitor,
  Cpu,
  FileText,
  Package,
  User,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export const dealerMenuItems: NavItem[] = [
  { label: '대시보드', href: '/dealer', icon: LayoutDashboard },
  { label: '표준 PC', href: '/dealer/products', icon: Monitor },
  { label: '리퍼 부품', href: '/dealer/refurb', icon: Cpu },
  { label: '견적 요청', href: '/dealer/quotes', icon: FileText },
  { label: '발주 내역', href: '/dealer/orders', icon: Package },
  { label: '마이페이지', href: '/dealer/mypage', icon: User },
]
