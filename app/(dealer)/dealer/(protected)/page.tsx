/**
 * 거래처 대시보드 (메인)
 */
import Link from 'next/link'
import { Package, FileText, CheckCircle, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'

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
          <CardContent>
            <p className="text-sm text-zinc-400 py-4 text-center">활동 내역이 없습니다.</p>
          </CardContent>
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
