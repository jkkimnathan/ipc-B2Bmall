'use client'

/**
 * 견적 거절 다이얼로그
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { rejectQuote } from '@/app/(dealer)/dealer/(protected)/quotes/actions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  rfqId: string
}

export default function RejectQuoteDialog({ open, onOpenChange, rfqId }: Props) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()

  const handleReject = () => {
    if (!reason.trim()) { toast.error('거절 사유를 입력해주세요.'); return }

    startTransition(async () => {
      try {
        await rejectQuote(rfqId, reason)
        toast.success('견적이 거절되었습니다.')
        onOpenChange(false)
        setReason('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '거절 실패')
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) { onOpenChange(false); setReason('') } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>견적을 거절하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            거절 후에는 되돌릴 수 없습니다. 재협의가 필요하면 새 견적 요청을 제출해주세요.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label className="text-sm">거절 사유 (필수)</Label>
          <Textarea
            placeholder="예: 예산 초과, 다른 견적 선택, 요구사항 변경 등"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={pending}
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setReason('') }} disabled={pending}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={pending || !reason.trim()}>
            {pending ? '처리 중...' : '거절하기'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
