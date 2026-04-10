/**
 * 거래처 대시보드 (메인)
 */
import Link from 'next/link'
import { Package, FileText, CheckCircle, Receipt } from 'lucide-react'
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

  // 통계 조회 (0으로 시작, 5단계 이후 데이터 연결)
  const { count: activeOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('dealer_id', dealerId)
    .in('status', ['submitted', 'approved', 'in_production'])

  const { count: pendingQuotes } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .eq('dealer_id', dealerId)
    .eq('status', 'submitted')

  const { count: approvedQuotes } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .eq('dealer_id', dealerId)
    .in('status', ['quoted', 'accepted'])

  // 이번 달 발주 합계
  const firstDay = new Date()
  firstDay.setDate(1)
  firstDay.setHours(0, 0, 0, 0)
  const { data: monthOrders } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('dealer_id', dealerId)
    .gte('submitted_at', firstDay.toISOString())

  const monthTotal = monthOrders?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0
  const activities = await getDealerRecentActivities(dealerId)

  const cards = [
    { title: '진행중 발주', value: String(activeOrders ?? 0), icon: Package, href: '/dealer/orders', color: 'text-blue-600' },
    { title: '회신 대기 견적', value: String(pendingQuotes ?? 0), icon: FileText, href: '/dealer/quotes', color: 'text-orange-600' },
    { title: '승인 받은 견적', value: String(approvedQuotes ?? 0), icon: CheckCircle, href: '/dealer/quotes', color: 'text-green-600' },
    { title: '이번 달 발주 합계', value: monthTotal.toLocaleString('ko-KR') + '원', icon: Receipt, href: '/dealer/orders', color: 'text-purple-600' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* 인사말 */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          안녕하세요, {session.dealerUser.name}님
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {session.dealer.company_name} &middot; iPC Mall에 오신 것을 환영합니다
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">{card.title}</CardTitle>
                <card.icon className={`size-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-zinc-900">{card.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 최근 활동 / 공지사항 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 활동</CardTitle>
          </CardHeader>
          {activities.length === 0 ? (
            <CardContent>
              <p className="text-sm text-zinc-400 py-4 text-center">활동 내역이 없습니다.</p>
            </CardContent>
          ) : (
            <CardContent className="divide-y p-0">
              {activities.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${a.type === 'order' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{a.title}</p>
                      <p className="text-xs text-zinc-500">{a.sub}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(a.time).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </Link>
              ))}
            </CardContent>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">공지사항</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400 py-4 text-center">공지사항이 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
