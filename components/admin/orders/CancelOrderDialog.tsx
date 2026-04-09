'use client'

/**
 * 관리자 발주 취소 다이얼로그
 * 취소 사유(필수) — 취소 후 되돌릴 수 없음
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
import { adminCancelOrder } from '@/app/(admin)/admin/(dashboard)/orders/actions'

interface Props {
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

export default function CancelOrderDialog({ orderId, open, onOpenChange, onDone }: Props) {
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('취소 사유를 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      await adminCancelOrder(orderId, reason)
      toast.success('발주가 취소되었습니다.')
      onOpenChange(false)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '취소 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>발주 취소</AlertDialogTitle>
          <AlertDialogDescription>
            취소 후에는 되돌릴 수 없습니다. 신중하게 결정해주세요.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="cancel-reason">취소 사유 *</Label>
          <Textarea
            id="cancel-reason"
            placeholder="취소 사유를 입력하세요."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            돌아가기
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading || !reason.trim()}>
            {loading ? '처리 중...' : '발주 취소'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
