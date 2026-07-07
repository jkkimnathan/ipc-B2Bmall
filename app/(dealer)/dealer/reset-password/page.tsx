'use client'

/**
 * 비밀번호 재설정 페이지
 * 이메일의 재설정 링크를 클릭하면 이 페이지로 이동.
 * Supabase Auth가 URL 해시에 토큰을 포함하여 자동 세션 설정.
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // 비밀번호 재설정 링크로 진입한 경우에만(PASSWORD_RECOVERY 이벤트) 폼을 활성화한다.
    // 일반 로그인 세션만으로는 활성화하지 않는다 (복구 토큰 없는 비밀번호 변경 차단).
    const supabase = createClient()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess(true)
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/dealer/login')
      }, 3000)
    } catch {
      setError('비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-zinc-900">변경 완료</h1>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-sm text-zinc-600">
              비밀번호가 성공적으로 변경되었습니다.
            </p>
            <p className="text-xs text-zinc-400">
              잠시 후 로그인 페이지로 이동합니다...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-12 text-center">
            <div className="size-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-600 mx-auto mb-4" />
            <p className="text-sm text-zinc-500">인증 확인 중...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900">새 비밀번호 설정</h1>
          <p className="text-sm text-zinc-500">새로운 비밀번호를 입력해주세요.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">새 비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상"
                required
                minLength={8}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm">비밀번호 확인</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="비밀번호 다시 입력"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
