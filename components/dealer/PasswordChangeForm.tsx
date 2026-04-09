'use client'

/**
 * 비밀번호 변경 폼
 * 현재 비밀번호 검증 → 새 비밀번호 설정
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PasswordChangeForm() {
  const router = useRouter()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPw) { toast.error('현재 비밀번호를 입력해주세요.'); return }
    if (newPw.length < 8) { toast.error('새 비밀번호는 8자 이상이어야 합니다.'); return }
    if (newPw !== confirmPw) { toast.error('새 비밀번호가 일치하지 않습니다.'); return }
    if (currentPw === newPw) { toast.error('현재 비밀번호와 다른 비밀번호를 입력해주세요.'); return }

    setLoading(true)
    try {
      const supabase = createClient()

      // 현재 비밀번호 검증: 현재 세션의 이메일로 재인증
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { toast.error('세션 정보를 확인할 수 없습니다.'); return }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      })

      if (signInError) {
        toast.error('현재 비밀번호가 올바르지 않습니다.')
        return
      }

      // 새 비밀번호 설정
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPw,
      })

      if (updateError) {
        toast.error('비밀번호 변경 실패: ' + updateError.message)
        return
      }

      toast.success('비밀번호가 변경되었습니다.')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      router.push('/dealer/mypage')
    } catch {
      toast.error('비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-base">비밀번호 변경</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="current">현재 비밀번호</Label>
            <Input
              id="current"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="현재 비밀번호"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new">새 비밀번호</Label>
            <Input
              id="new"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="8자 이상"
              required
              minLength={8}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">새 비밀번호 확인</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="새 비밀번호 다시 입력"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
