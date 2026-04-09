'use client'

/**
 * 발주 이력 타임라인 컴포넌트
 *
 * 관리자 화면(showInternal=true)과 거래처 화면(showInternal=false) 모두에서 사용.
 * 거래처에 비공개인 이벤트는 showInternal=false일 때 자동으로 필터링된다.
 */
import { useState } from 'react'
import {
  FileUp, Pencil, XCircle, CheckCircle, CalendarCheck,
  Cog, Truck, CircleCheckBig, Ban, StickyNote, MessageSquare,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatRelativeTime } from '@/lib/utils/format'
import { orderEventLabel, orderEventColor } from '@/lib/orders/event-utils'
import type { OrderEvent, OrderEventType } from '@/types/database'

// lucide 아이콘 매핑
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileUp,
  Pencil,
  XCircle,
  CheckCircle,
  CalendarCheck,
  Cog,
  Truck,
  CircleCheckBig,
  Ban,
  StickyNote,
  MessageSquare,
}

const ICON_BY_EVENT: Record<OrderEventType, string> = {
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

// tailwind 색상 → dot 색상 클래스
function dotColorClass(color: string): string {
  const map: Record<string, string> = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    green: 'bg-green-500',
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    teal: 'bg-teal-500',
    zinc: 'bg-zinc-400',
  }
  return map[color] ?? 'bg-zinc-400'
}

function iconColorClass(color: string): string {
  const map: Record<string, string> = {
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    green: 'text-green-600',
    indigo: 'text-indigo-600',
    purple: 'text-purple-600',
    teal: 'text-teal-600',
    zinc: 'text-zinc-500',
  }
  return map[color] ?? 'text-zinc-500'
}

// 행위자 타입 뱃지
function actorBadge(actorType: string) {
  if (actorType === 'admin') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">관리자</Badge>
  if (actorType === 'dealer') return <Badge variant="outline" className="text-[10px] px-1.5 py-0">거래처</Badge>
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0">시스템</Badge>
}

// ============================================================
// 메인 컴포넌트
// ============================================================

interface OrderTimelineProps {
  events: OrderEvent[]
  showInternal?: boolean
}

export default function OrderTimeline({
  events,
  showInternal = true,
}: OrderTimelineProps) {
  // 거래처 화면: 비공개 이벤트 필터링
  const visibleEvents = showInternal
    ? events
    : events.filter((e) => e.is_visible_to_dealer)

  if (visibleEvents.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-400">
        아직 이력이 없습니다.
      </p>
    )
  }

  return (
    <div className="relative pl-6">
      {/* 세로줄 */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-zinc-200" />

      {visibleEvents.map((event, i) => (
        <TimelineItem
          key={event.id}
          event={event}
          isLast={i === visibleEvents.length - 1}
          showInternal={showInternal}
        />
      ))}
    </div>
  )
}

// ============================================================
// 타임라인 항목
// ============================================================

function TimelineItem({
  event,
  isLast,
  showInternal,
}: {
  event: OrderEvent
  isLast: boolean
  showInternal: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const color = orderEventColor(event.event_type)
  const iconName = ICON_BY_EVENT[event.event_type] ?? 'MessageSquare'
  const IconComp = ICON_MAP[iconName] ?? MessageSquare
  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0

  return (
    <div className={`relative flex gap-3 ${isLast ? '' : 'pb-6'}`}>
      {/* 아이콘 점 */}
      <div
        className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full ${dotColorClass(color)} -ml-6`}
      >
        <IconComp className="size-3.5 text-white" />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${iconColorClass(color)}`}>
            {orderEventLabel(event.event_type)}
          </span>
          <span className="text-xs text-zinc-400">
            {formatRelativeTime(event.created_at)}
          </span>
          <span className="text-[11px] text-zinc-300">
            {formatDateTime(event.created_at)}
          </span>
        </div>

        {/* 작성자 */}
        {event.actor_name && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-zinc-500">{event.actor_name}</span>
            {actorBadge(event.actor_type)}
            {!event.is_visible_to_dealer && showInternal && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-400 border-zinc-200">
                비공개
              </Badge>
            )}
          </div>
        )}

        {/* 메시지 */}
        {event.message && (
          <p className="text-sm text-zinc-600 mt-1 whitespace-pre-wrap">{event.message}</p>
        )}

        {/* 메타데이터 접기/펼치기 */}
        {hasMetadata && showInternal && (
          <div className="mt-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
            >
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              상세 정보
            </button>
            {expanded && (
              <pre className="mt-1 p-2 rounded bg-zinc-50 text-xs text-zinc-500 overflow-x-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
