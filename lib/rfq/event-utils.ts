/**
 * RFQ 이벤트 표시 유틸리티 (클라이언트/서버 공용)
 */
import type { RfqEventType } from '@/types/database'

const EVENT_LABELS: Record<RfqEventType, string> = {
  submitted: '견적 요청 제출',
  dealer_updated: '거래처 수정',
  dealer_canceled: '거래처 취소',
  quote_draft_saved: '견적서 임시저장',
  quote_sent: '견적서 발송',
  quote_revised: '재견적 발송',
  accepted: '거래처 수락',
  rejected_by_dealer: '거래처 거절',
  expired: '견적서 만료',
  converted_to_order: '발주 전환',
  admin_memo: '관리자 메모',
  note: '기록',
}

export function rfqEventLabel(eventType: RfqEventType): string {
  return EVENT_LABELS[eventType] ?? eventType
}

const EVENT_ICONS: Record<RfqEventType, string> = {
  submitted: 'FileUp',
  dealer_updated: 'Pencil',
  dealer_canceled: 'XCircle',
  quote_draft_saved: 'Save',
  quote_sent: 'Send',
  quote_revised: 'RefreshCw',
  accepted: 'CheckCircle',
  rejected_by_dealer: 'XCircle',
  expired: 'Clock',
  converted_to_order: 'Package',
  admin_memo: 'StickyNote',
  note: 'MessageSquare',
}

export function rfqEventIcon(eventType: RfqEventType): string {
  return EVENT_ICONS[eventType] ?? 'Circle'
}

const EVENT_COLORS: Record<RfqEventType, string> = {
  submitted: 'blue',
  dealer_updated: 'yellow',
  dealer_canceled: 'red',
  quote_draft_saved: 'zinc',
  quote_sent: 'green',
  quote_revised: 'indigo',
  accepted: 'green',
  rejected_by_dealer: 'red',
  expired: 'zinc',
  converted_to_order: 'purple',
  admin_memo: 'zinc',
  note: 'zinc',
}

export function rfqEventColor(eventType: RfqEventType): string {
  return EVENT_COLORS[eventType] ?? 'zinc'
}
