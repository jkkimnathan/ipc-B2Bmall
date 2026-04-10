/**
 * 관리자 대시보드 페이지
 *
 * 요약 카드 4개로 iPC Mall 운영 현황을 한눈에 보여준다.
 * 서버 컴포넌트에서 Supabase를 직접 호출하여 각 건수를 가져온다.
 */
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Inbox, FileText, UserPlus, Truck } from 'lucide-react'

interface RecentActivity {
  id: string
  type: 'order' | 'rfq' | 'dealer'
  title: string
  sub: string
  time: string
  href: string
}

async function getRecentActivities(): Promise<RecentActivity[]> {
  try {
    const supabase = await createClient()
    const activities: RecentActivity[] = []

    const [orders, rfqs, dealers] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_no, status, total_amount, submitted_at, dealers(company_name)')
        .order('submitted_at', { ascending: false })
        .limit(5),
      supabase
        .from('quote_requests')
        .select('id, rfq_no, title, status, submitted_at, dealers(company_name)')
        .order('submitted_at', { ascending: false })
        .limit(5),
      supabase
        .from('dealers')
        .select('id, company_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    for (const o of orders.data ?? []) {
      const dealer = o.dealers as unknown as { company_name: string } | null
      activities.push({
        id: `order-${o.id}`,
        type: 'order',
        title: `[발주] ${o.order_no}`,
        sub: `${dealer?.company_name ?? ''} · ${(o.total_amount ?? 0).toLocaleString()}원`,
        time: o.submitted_at,
        href: `/admin/orders/${o.id}`,
      })
    }

    for (const r of rfqs.data ?? []) {
      const dealer = r.dealers as unknown as { company_name: string } | null
      activities.push({
        id: `rfq-${r.id}`,
        type: 'rfq',
        title: `[견적] ${r.rfq_no}`,
        sub: `${dealer?.company_name ?? ''} · ${r.title}`,
        time: r.submitted_at,
        href: `/admin/quotes/${r.id}`,
      })
    }

    for (const d of dealers.data ?? []) {
      activities.push({
        id: `dealer-${d.id}`,
        type: 'dealer',
        title: `[거래처] ${d.company_name}`,
        sub: d.status === 'pending' ? '승인 대기' : d.status === 'active' ? '승인 완료' : '정지',
        time: d.created_at,
        href: `/admin/dealers/${d.id}`,
      })
    }

    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    return activities.slice(0, 10)
  } catch {
    return []
  }
}

// 대시보드 요약 데이터를 Supabase에서 가져오는 함수
async function getDashboardStats() {
  try {
    const supabase = await createClient()

    // 4개 카운트를 병렬로 가져오기
    const [newOrders, newRfqs, pendingDealers, upcomingShipments] =
      await Promise.all([
        // 1. 신규 발주 (status = 'submitted')
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'submitted'),

        // 2. 신규 견적 요청 (status = 'submitted')
        supabase
          .from('quote_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'submitted'),

        // 3. 승인 대기 거래처 (status = 'pending')
        supabase
          .from('dealers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),

        // 4. 출하 예정 (3일 이내): approved 상태 + 출하일이 3일 이내
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .lte(
            'expected_ship_date',
            new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
          ),
      ])

    return {
      newOrders: newOrders.count ?? 0,
      newRfqs: newRfqs.count ?? 0,
      pendingDealers: pendingDealers.count ?? 0,
      upcomingShipments: upcomingShipments.count ?? 0,
    }
  } catch {
    // 에러 발생 시 모두 0으로 표시
    return { newOrders: 0, newRfqs: 0, pendingDealers: 0, upcomingShipments: 0 }
  }
}

export default async function AdminDashboardPage() {
  const [stats, activities] = await Promise.all([
    getDashboardStats(),
    getRecentActivities(),
  ])

  // 요약 카드 데이터 정의
  const cards = [
    {
      label: '신규 발주',
      value: stats.newOrders,
      sub: '확인 필요',
      icon: Inbox,
      href: '/admin/orders?status=submitted',
      color: 'text-blue-600',
    },
    {
      label: '신규 견적 요청',
      value: stats.newRfqs,
      sub: '회신 대기',
      icon: FileText,
      href: '/admin/quotes?status=submitted',
      color: 'text-orange-600',
    },
    {
      label: '승인 대기 거래처',
      value: stats.pendingDealers,
      sub: '가입 검토',
      icon: UserPlus,
      href: '/admin/dealers?status=pending',
      color: 'text-green-600',
    },
    {
      label: '출하 예정 (3일 이내)',
      value: stats.upcomingShipments,
      sub: '준비 필요',
      icon: Truck,
      href: '/admin/orders?status=approved',
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* 페이지 제목 */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">대시보드</h1>
        <p className="text-sm text-zinc-500">iPC Mall 운영 현황</p>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">
                  {card.label}
                </CardTitle>
                <card.icon className={`size-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <p className="text-xs text-zinc-400">{card.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 최근 활동 섹션 */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">최근 활동</h2>
        <Card>
          {activities.length === 0 ? (
            <CardContent className="py-8 text-center text-sm text-zinc-400">
              최근 활동이 없습니다.
            </CardContent>
          ) : (
            <CardContent className="divide-y p-0">
              {activities.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${
                      a.type === 'order' ? 'bg-blue-500' : a.type === 'rfq' ? 'bg-orange-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{a.title}</p>
                      <p className="text-xs text-zinc-500">{a.sub}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(a.time).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </Link>
              ))}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
