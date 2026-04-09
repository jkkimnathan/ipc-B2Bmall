'use client'

/**
 * 발주 승인 다이얼로그
 * 출고 예정일 입력(필수) + 거래처 전달 메모(선택)
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { approveOrder } from '@/app/(admin)/admin/(dashboard)/orders/actions'

interface Props {
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

export default function ApproveOrderDialog({ orderId, open, onOpenChange, onDone }: Props) {
  const [loading, setLoading] = useState(false)
  const [shipDate, setShipDate] = useState('')
  const [memo, setMemo] = useState('')

  // 내일 날짜 (최소 선택 가능일)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const handleSubmit = async () => {
    if (!shipDate) {
      toast.error('출고 예정일을 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      await approveOrder(orderId, shipDate, memo || undefined)
      toast.success('발주가 승인되었습니다.')
      onOpenChange(false)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '승인 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>발주 승인</AlertDialogTitle>
          <AlertDialogDescription>
            출고 예정일을 지정하고 발주를 승인합니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ship-date">출고 예정일 *</Label>
            <Input
              id="ship-date"
              type="date"
              min={tomorrow}
              value={shipDate}
              onChange={(e) => setShipDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="approve-memo">거래처 전달 메모 (선택)</Label>
            <Textarea
              id="approve-memo"
              placeholder="거래처에 전달할 내용이 있으면 입력하세요."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !shipDate}>
            {loading ? '처리 중...' : '승인'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
