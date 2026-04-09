/**
 * 발주 이벤트 표시 유틸리티 (클라이언트/서버 공용)
 *
 * 서버 전용 Supabase import가 없으므로 클라이언트 컴포넌트에서도 안전하게 사용 가능.
 */
import type { OrderEventType } from '@/types/database'

// ============================================================
// 이벤트 타입별 한글 라벨
// ============================================================

const EVENT_LABELS: Record<OrderEventType, string> = {
  submitted: '발주 제출',
  dealer_updated: '거래처 수정',
  dealer_canceled: '거래처 취소',
  approved: '관리자 승인',
  rejected: '관리자 반려',
  ship_date_set: '출고 예정일 지정',
  in_production: '생산 시작',
  shipped: '출고 완료',
  completed: '거래 완료',
  admin_canceled: '관리자 취소',
  admin_memo: '관리자 메모',
  note: '기록',
}

export function orderEventLabel(eventType: OrderEventType): string {
  return EVENT_LABELS[eventType] ?? eventType
}

// ============================================================
// 이벤트 타입별 아이콘 (lucide-react 아이콘 이름)
// ============================================================

const EVENT_ICONS: Record<OrderEventType, string> = {
  submitted: 'FileUp',
  dealer_updated: 'Pencil',
  dealer_canceled: 'XCircle',
  approved: 'CheckCircle',
  rejected: 'XCircle',
  ship_date_set: 'CalendarCheck',
  in_production: 'Cog',
  shipped: 'Truck',
  completed: 'CircleCheckBig',
  admin_canceled: 'Ban',
  admin_memo: 'StickyNote',
  note: 'MessageSquare',
}

export function orderEventIcon(eventType: OrderEventType): string {
  return EVENT_ICONS[eventType] ?? 'Circle'
}

// ============================================================
// 이벤트 타입별 색상 (tailwind 색상 키워드)
// ============================================================

const EVENT_COLORS: Record<OrderEventType, string> = {
  submitted: 'blue',
  dealer_updated: 'yellow',
  dealer_canceled: 'red',
  approved: 'green',
  rejected: 'red',
  ship_date_set: 'indigo',
  in_production: 'purple',
  shipped: 'teal',
  completed: 'green',
  admin_canceled: 'red',
  admin_memo: 'zinc',
  note: 'zinc',
}

export function orderEventColor(eventType: OrderEventType): string {
  return EVENT_COLORS[eventType] ?? 'zinc'
}
