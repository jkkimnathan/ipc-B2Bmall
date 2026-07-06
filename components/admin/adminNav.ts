/**
 * 관리자 사이드바 메뉴 정의 (데스크톱 사이드바 + 모바일 드로어 공용)
 */
import {
  LayoutDashboard,
  Users,
  Monitor,
  Cpu,
  Package,
  FileText,
  Settings,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export const adminMenuItems: NavItem[] = [
  { label: '대시보드', href: '/admin', icon: LayoutDashboard },
  { label: '거래처 관리', href: '/admin/dealers', icon: Users },
  { label: '표준 PC 관리', href: '/admin/products', icon: Monitor },
  { label: '리퍼 부품 관리', href: '/admin/refurb', icon: Cpu },
  { label: '발주 관리', href: '/admin/orders', icon: Package },
  { label: '견적 요청', href: '/admin/quotes', icon: FileText },
  { label: '설정', href: '/admin/settings', icon: Settings },
]
