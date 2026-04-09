'use client'

/**
 * 발주 반려 다이얼로그
 * 반려 사유(필수) — 거래처에 전달됨
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { rejectOrder } from '@/app/(admin)/admin/(dashboard)/orders/actions'

interface Props {
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

export default function RejectOrderDialog({ orderId, open, onOpenChange, onDone }: Props) {
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('반려 사유를 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      await rejectOrder(orderId, reason)
      toast.success('발주가 반려되었습니다.')
      onOpenChange(false)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '반려 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>발주 반려</AlertDialogTitle>
          <AlertDialogDescription>
            반려 사유는 거래처에 전달됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reject-reason">반려 사유 *</Label>
          <Textarea
            id="reject-reason"
            placeholder="반려 사유를 입력하세요."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading || !reason.trim()}>
            {loading ? '처리 중...' : '반려하기'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
