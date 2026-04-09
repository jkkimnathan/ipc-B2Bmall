'use client'

/**
 * 임시 비밀번호 표시 다이얼로그
 * 거래처 등록, 승인, 담당자 추가, 비밀번호 재설정 후 공통으로 사용.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CredentialDialogProps {
  open: boolean
  loginId: string
  tempPassword: string
  onClose: () => void
}

export default function CredentialDialog({ open, loginId, tempPassword, onClose }: CredentialDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`로그인 ID: ${loginId}\n임시 비밀번호: ${tempPassword}`)
      setCopied(true)
      toast.success('복사 완료')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('복사에 실패했습니다. 수동으로 복사해주세요.')
    }
  }

  const handleClose = () => {
    if (!copied) {
      if (!confirm('임시 비밀번호를 안전한 곳에 보관하셨나요? 이 화면을 닫으면 다시 확인할 수 없습니다.')) {
        return
      }
    }
    onClose()
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="size-5 text-green-600" />
            계정이 생성되었습니다
          </AlertDialogTitle>
          <AlertDialogDescription>
            아래 계정 정보를 거래처에 안전하게 전달하세요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-zinc-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">로그인 ID</span>
              <span className="font-mono font-medium text-zinc-900">{loginId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">임시 비밀번호</span>
              <span className="font-mono font-bold text-zinc-900">{tempPassword}</span>
            </div>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
            임시 비밀번호는 이 화면에서만 확인할 수 있습니다.
            복사 버튼으로 복사해서 거래처에 안전하게 전달하세요.
          </div>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="size-4" />
            {copied ? '복사됨' : '복사'}
          </Button>
          <Button onClick={handleClose}>확인</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
