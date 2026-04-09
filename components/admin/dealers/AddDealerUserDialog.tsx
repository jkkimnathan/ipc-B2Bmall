'use client'

/**
 * 담당자 추가 다이얼로그
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { addDealerUser } from '@/app/(admin)/admin/(dashboard)/dealers/actions'

interface Props {
  open: boolean
  dealerId: string
  onClose: () => void
  onSuccess: (loginId: string, tempPassword: string) => void
}

export default function AddDealerUserDialog({ open, dealerId, onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('담당자명을 입력해주세요.'); return }
    if (!email.trim()) { toast.error('이메일을 입력해주세요.'); return }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.set('name', name.trim())
      formData.set('email', email.trim())
      formData.set('phone', phone)
      formData.set('role', role)

      const result = await addDealerUser(dealerId, formData)
      setName(''); setEmail(''); setPhone(''); setRole('')
      onSuccess(result.loginId, result.tempPassword)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '추가 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>담당자 추가</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>담당자명 *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이영희" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>이메일 (로그인 ID) *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lee@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>휴대폰</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-5678-9012" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>직책</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="결제 담당" />
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>취소</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? '추가 중...' : '추가'}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
