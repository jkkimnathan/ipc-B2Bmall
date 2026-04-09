'use client'

/**
 * 관리자 발주 액션 패널
 *
 * 현재 상태에 따라 다음 단계 버튼, 출고 예정일 변경,
 * 내부 메모 관리를 제공한다.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Cog, Truck, CircleCheckBig, Ban, CalendarCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { orderStatusLabel, formatDate } from '@/lib/utils/format'

import ApproveOrderDialog from './ApproveOrderDialog'
import RejectOrderDialog from './RejectOrderDialog'
import CancelOrderDialog from './CancelOrderDialog'
import {
  startProduction, markShipped, completeOrder,
  setExpectedShipDate, saveAdminMemo,
} from '@/app/(admin)/admin/(dashboard)/orders/actions'

import type { Order } from '@/types/database'

interface Props {
  order: Order
}

export default function OrderActionPanel({ order }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // 다이얼로그 상태
  const [showApprove, setShowApprove] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showConfirm, setShowConfirm] = useState<'production' | 'shipped' | 'completed' | null>(null)

  // 출고 예정일
  const [shipDate, setShipDate] = useState(order.expected_ship_date ?? '')
  const [savingShipDate, setSavingShipDate] = useState(false)

  // 내부 메모
  const [adminMemo, setAdminMemo] = useState(order.admin_memo ?? '')
  const [savingMemo, setSavingMemo] = useState(false)

  const st = orderStatusLabel(order.status)
  const isTerminal = ['completed', 'canceled', 'rejected'].includes(order.status)

  const refreshPage = () => router.refresh()

  // 단순 상태 전환 (확인 다이얼로그 후)
  const handleSimpleTransition = async () => {
    if (!showConfirm) return
    setLoading(true)
    try {
      if (showConfirm === 'production') {
        await startProduction(order.id)
        toast.success('생산이 시작되었습니다.')
      } else if (showConfirm === 'shipped') {
        await markShipped(order.id)
        toast.success('출고가 완료되었습니다.')
      } else if (showConfirm === 'completed') {
        await completeOrder(order.id)
        toast.success('거래가 완료되었습니다.')
      }
      setShowConfirm(null)
      refreshPage()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '처리 실패')
    } finally {
      setLoading(false)
    }
  }

  // 출고 예정일 저장
  const handleSaveShipDate = async () => {
    if (!shipDate) return
    setSavingShipDate(true)
    try {
      await setExpectedShipDate(order.id, shipDate)
      toast.success('출고 예정일이 저장되었습니다.')
      refreshPage()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSavingShipDate(false)
    }
  }

  // 내부 메모 저장
  const handleSaveMemo = async () => {
    setSavingMemo(true)
    try {
      await saveAdminMemo(order.id, adminMemo)
      toast.success('메모가 저장되었습니다.')
      refreshPage()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSavingMemo(false)
    }
  }

  // 확인 다이얼로그 라벨
  const confirmLabels: Record<string, { title: string; desc: string; action: string }> = {
    production: { title: '생산 시작', desc: '이 발주의 생산을 시작합니다.', action: '생산 시작' },
    shipped: { title: '출고 완료', desc: '이 발주의 출고가 완료되었습니까?', action: '출고 완료' },
    completed: { title: '거래 완료', desc: '이 발주를 거래 완료 처리합니다. 이후 수정이 불가합니다.', action: '거래 완료' },
  }

  return (
    <div className="space-y-4">
      {/* 현재 상태 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">진행 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-zinc-400 mb-1">현재 상태</p>
            <Badge
              variant={
                order.status === 'rejected' || order.status === 'canceled'
                  ? 'destructive'
                  : order.status === 'completed'
                    ? 'outline'
                    : 'default'
              }
              className="text-sm"
            >
              {st.label}
            </Badge>
          </div>

          {/* 다음 단계 버튼들 */}
          {!isTerminal && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">다음 단계</p>
              <div className="flex flex-col gap-2">
                {order.status === 'submitted' && (
                  <>
                    <Button size="sm" onClick={() => setShowApprove(true)}>
                      <CheckCircle className="size-4 mr-1" /> 승인
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setShowReject(true)}>
                      <XCircle className="size-4 mr-1" /> 반려
                    </Button>
                  </>
                )}
                {order.status === 'approved' && (
                  <Button size="sm" onClick={() => setShowConfirm('production')}>
                    <Cog className="size-4 mr-1" /> 생산 시작
                  </Button>
                )}
                {order.status === 'in_production' && (
                  <Button size="sm" onClick={() => setShowConfirm('shipped')}>
                    <Truck className="size-4 mr-1" /> 출고 완료
                  </Button>
                )}
                {order.status === 'shipped' && (
                  <Button size="sm" onClick={() => setShowConfirm('completed')}>
                    <CircleCheckBig className="size-4 mr-1" /> 거래 완료
                  </Button>
                )}

                {/* 취소 버튼 (submitted/approved/in_production) */}
                {['submitted', 'approved', 'in_production'].includes(order.status) &&
                  order.status !== 'submitted' && (
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => setShowCancel(true)}>
                    <Ban className="size-4 mr-1" /> 취소
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 출고 예정일 */}
      {!isTerminal && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-1.5">
              <CalendarCheck className="size-4" /> 출고 예정일
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              type="date"
              value={shipDate}
              onChange={(e) => setShipDate(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleSaveShipDate}
              disabled={savingShipDate || !shipDate}
            >
              {savingShipDate ? '저장 중...' : '저장'}
            </Button>
            {order.expected_ship_date && (
              <p className="text-xs text-zinc-400">
                현재: {formatDate(order.expected_ship_date)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 내부 메모 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">내부 메모</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="내부 메모를 입력하세요."
            value={adminMemo}
            onChange={(e) => setAdminMemo(e.target.value)}
            rows={4}
            disabled={isTerminal}
          />
          {!isTerminal && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleSaveMemo}
              disabled={savingMemo}
            >
              {savingMemo ? '저장 중...' : '메모 저장'}
            </Button>
          )}
          <p className="text-[11px] text-zinc-400 leading-tight">
            내부 메모는 거래처에 노출되지 않습니다.
          </p>
        </CardContent>
      </Card>

      {/* 승인/반려/취소 다이얼로그 */}
      <ApproveOrderDialog
        orderId={order.id}
        open={showApprove}
        onOpenChange={setShowApprove}
        onDone={refreshPage}
      />
      <RejectOrderDialog
        orderId={order.id}
        open={showReject}
        onOpenChange={setShowReject}
        onDone={refreshPage}
      />
      <CancelOrderDialog
        orderId={order.id}
        open={showCancel}
        onOpenChange={setShowCancel}
        onDone={refreshPage}
      />

      {/* 단순 상태 전환 확인 다이얼로그 */}
      {showConfirm && (
        <AlertDialog open={!!showConfirm} onOpenChange={() => setShowConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmLabels[showConfirm].title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmLabels[showConfirm].desc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(null)} disabled={loading}>
                취소
              </Button>
              <Button onClick={handleSimpleTransition} disabled={loading}>
                {loading ? '처리 중...' : confirmLabels[showConfirm].action}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
