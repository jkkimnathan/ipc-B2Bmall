'use client'

/**
 * 거래처 담당자 관리 (거래처 측)
 * 대표 담당자만 추가/비활성화 가능.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { requestAddDealerUser, deactivateMyDealerUser } from '@/app/(dealer)/dealer/(protected)/mypage/actions'
import type { DealerUser } from '@/types/database'

interface Props {
  users: DealerUser[]
  currentUserId: string
  isPrimary: boolean
}

export default function DealerMyUserList({ users, currentUserId, isPrimary }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')

  const handleAdd = async () => {
    if (!name.trim()) { toast.error('담당자명을 입력해주세요.'); return }
    if (!email.trim()) { toast.error('이메일을 입력해주세요.'); return }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.set('name', name.trim())
      formData.set('email', email.trim())
      formData.set('phone', phone)
      formData.set('role', role)
      await requestAddDealerUser(formData)
      toast.success('담당자 추가 신청이 접수되었습니다. 관리자 확인 후 계정이 발급됩니다.')
      setShowAdd(false)
      setName(''); setEmail(''); setPhone(''); setRole('')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '추가 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (userId: string) => {
    if (!confirm('이 담당자를 비활성화하시겠습니까?')) return
    try {
      await deactivateMyDealerUser(userId)
      toast.success('비활성화되었습니다.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '실패')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">담당자 목록</h3>
        {isPrimary && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="size-4" />
            담당자 추가
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 mb-4">
        담당자 추가 후 관리자(영업담당)가 확인하여 로그인 계정을 발급합니다.
        본인 비밀번호는 &quot;비밀번호 변경&quot; 탭에서 직접 변경할 수 있습니다.
      </div>

      {users.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>직책</TableHead>
                <TableHead className="text-center">대표</TableHead>
                <TableHead>상태</TableHead>
                {isPrimary && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name}
                    {user.id === currentUserId && (
                      <span className="text-xs text-zinc-400 ml-1">(본인)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{user.email ?? user.login_id}</TableCell>
                  <TableCell>{user.role ?? '—'}</TableCell>
                  <TableCell className="text-center">
                    {user.is_primary && <Star className="inline size-4 text-yellow-500 fill-yellow-500" />}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? '활성' : user.auth_user_id ? '비활성' : '승인대기'}
                    </Badge>
                  </TableCell>
                  {isPrimary && (
                    <TableCell>
                      {user.id !== currentUserId && !user.is_primary && user.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeactivate(user.id)}
                        >
                          비활성화
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-zinc-400 py-8 text-center">등록된 담당자가 없습니다.</p>
      )}

      {/* 담당자 추가 다이얼로그 */}
      <AlertDialog open={showAdd} onOpenChange={(v) => { if (!v) setShowAdd(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>담당자 추가 신청</AlertDialogTitle>
            <AlertDialogDescription>
              관리자 확인 후 로그인 계정이 발급됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>담당자명 *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이영희" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>이메일 *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lee@company.com" />
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
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={saving}>취소</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? '신청 중...' : '추가 신청'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
