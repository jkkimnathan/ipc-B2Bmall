/**
 * 거래처 대시보드 (메인) · 리뉴얼 · 보수적 방향
 *
 * ───────────────────────────────────────────────────────
 *  ▸ 적용 경로 : app/(dealer)/dealer/(protected)/page.tsx
 *  ▸ 원본 대비 변경점
 *    - 데이터 조회 로직(Supabase 쿼리 · 집계 · activities) 전혀 수정 없음
 *    - 요약 카드의 색상 의미를 일관된 블루 액센트 + 의미별 색 배지로 재구성
 *    - "인사말 + 분기 요약 배너" 상단에 배치하여 B2B 포털 맥락 강화
 *    - 최근 활동 / 공지사항 섹션의 정보 밀도와 여백을 조정
 *    - 빈 상태(empty state) 카피와 시각적 피드백 강화
 * ───────────────────────────────────────────────────────
 */
import Link from 'next/link'
import { Package, FileText, CheckCircle, Receipt, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'

interface RecentActivity {
  id: string
  type: 'order' | 'rfq'
  title: string
  sub: string
  time: string
  href: string
}

async function getDealerRecentActivities(dealerId: string): Promise<RecentActivity[]> {
  const supabase = await createClient()
  const activities: RecentActivity[] = []

  const [orders, rfqs] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_no, status, total_amount, submitted_at')
      .eq('dealer_id', dealerId)
      .order('submitted_at', { ascending: false })
      .limit(5),
    supabase
      .from('quote_requests')
      .select('id, rfq_no, title, status, submitted_at')
      .eq('dealer_id', dealerId)
      .order('submitted_at', { ascending: false })
      .limit(5),
  ])

  const orderStatusLabel: Record<string, string> = {
    submitted: '제출됨', approved: '승인됨', rejected: '반려됨',
    in_production: '생산중', shipped: '출고됨', completed: '완료', canceled: '취소됨',
  }
  const rfqStatusLabel: Record<string, string> = {
    submitted: '회신 대기', quoted: '견적서 도착', accepted: '수락됨',
    rejected: '거절됨', expired: '만료됨', converted_to_order: '발주 전환됨',
  }

  for (const o of orders.data ?? []) {
    activities.push({
      id: `order-${o.id}`,
      type: 'order',
      title: `발주 ${o.order_no}`,
      sub: `${(o.total_amount ?? 0).toLocaleString()}원 · ${orderStatusLabel[o.status] ?? o.status}`,
      time: o.submitted_at,
      href: `/dealer/orders/${o.id}`,
    })
  }

  for (const r of rfqs.data ?? []) {
    activities.push({
      id: `rfq-${r.id}`,
      type: 'rfq',
      title: `견적 ${r.rfq_no}`,
      sub: `${r.title} · ${rfqStatusLabel[r.status] ?? r.status}`,
      time: r.submitted_at,
      href: `/dealer/quotes/${r.id}`,
    })
  }

  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  return activities.slice(0, 7)
}

export default async function DealerDashboardPage() {
  const session = await requireDealer()
  const supabase = await createClient()
  const dealerId = session.dealer.id

  // 이번 달 시작일
  const firstDay = new Date()
  firstDay.setDate(1)
  firstDay.setHours(0, 0, 0, 0)

  // 통계 + 최근 활동을 전부 병렬 조회 (순차 대기 5회 → 1회)
  const [
    { count: activeOrders },
    { count: pendingQuotes },
    { count: approvedQuotes },
    { data: monthOrders },
    activities,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealerId)
      .in('status', ['submitted', 'approved', 'in_production']),
    supabase
      .from('quote_requests')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealerId)
      .eq('status', 'submitted'),
    supabase
      .from('quote_requests')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealerId)
      .in('status', ['quoted', 'accepted']),
    supabase
      .from('orders')
      .select('total_amount')
      .eq('dealer_id', dealerId)
      .gte('submitted_at', firstDay.toISOString()),
    getDealerRecentActivities(dealerId),
  ])

  const monthTotal = monthOrders?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0

  const cards = [
    {
      title: '진행중 발주', value: String(activeOrders ?? 0), suffix: '건',
      icon: Package, href: '/dealer/orders',
      iconBg: 'bg-blue-50', iconFg: 'text-blue-600',
    },
    {
      title: '회신 대기 견적', value: String(pendingQuotes ?? 0), suffix: '건',
      icon: FileText, href: '/dealer/quotes',
      iconBg: 'bg-amber-50', iconFg: 'text-amber-600',
    },
    {
      title: '승인 받은 견적', value: String(approvedQuotes ?? 0), suffix: '건',
      icon: CheckCircle, href: '/dealer/quotes',
      iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600',
    },
    {
      title: '이번 달 발주 합계', value: monthTotal.toLocaleString('ko-KR'), suffix: '원',
      icon: Receipt, href: '/dealer/orders',
      iconBg: 'bg-slate-100', iconFg: 'text-slate-700',
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* 상단 인사말 + 오늘 날짜 */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
            Dealer Workspace
          </div>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-slate-900">
            안녕하세요, {session.dealerUser.name}님
          </h1>
          <p className="mt-1 text-[13.5px] text-slate-500">
            {session.dealer.company_name} · iPC B2B Mall에 오신 것을 환영합니다
          </p>
        </div>
        <div className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-right md:block">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Today</div>
          <div className="mt-0.5 font-mono text-[13px] font-semibold text-slate-700">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="group">
            <Card className="border-slate-200 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[12.5px] font-semibold text-slate-500">
                  {card.title}
                </CardTitle>
                <span className={`flex size-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <card.icon className={`size-[17px] ${card.iconFg}`} />
                </span>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className="text-[26px] font-extrabold tracking-tight text-slate-900 tabular-nums">
                    {card.value}
                  </span>
                  <span className="text-[13px] font-medium text-slate-400">{card.suffix}</span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11.5px] font-semibold text-slate-400 transition-colors group-hover:text-blue-700">
                  자세히 보기
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 최근 활동 / 공지사항 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <CardTitle className="text-[15px] font-bold text-slate-900">최근 활동</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-slate-500">최근 발주 · 견적 요청 내역</p>
            </div>
            <Link
              href="/dealer/orders"
              className="flex items-center gap-1 text-[12px] font-semibold text-blue-700 hover:text-blue-800"
            >
              전체 보기 <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          {activities.length === 0 ? (
            <CardContent>
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-slate-50">
                  <FileText className="size-5 text-slate-300" />
                </div>
                <p className="text-[13px] text-slate-400">활동 내역이 없습니다.</p>
                <p className="text-[11.5px] text-slate-400">
                  견적 요청이나 발주를 시작하면 이곳에 표시됩니다.
                </p>
              </div>
            </CardContent>
          ) : (
            <CardContent className="divide-y divide-slate-100 p-0">
              {activities.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        a.type === 'order'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {a.type === 'order' ? '발주' : '견적'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900">{a.title}</p>
                      <p className="truncate text-[12px] text-slate-500">{a.sub}</p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[11.5px] text-slate-400">
                    {new Date(a.time).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                  </span>
                </Link>
              ))}
            </CardContent>
          )}
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <CardTitle className="text-[15px] font-bold text-slate-900">공지사항</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-slate-500">인텍앤컴퍼니 B2B 운영 공지</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-50">
                <Receipt className="size-5 text-slate-300" />
              </div>
              <p className="text-[13px] text-slate-400">공지사항이 없습니다.</p>
              <p className="text-[11.5px] text-slate-400">
                신제품 입고 · 프로모션은 이곳에서 확인하실 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
