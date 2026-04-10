'use client'

/**
 * 거래처 로그인 페이지
 * 이메일+비밀번호 로그인 → dealer_users 권한 확인 → /dealer 대시보드 이동
 */
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DealerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // 1. Supabase Auth 로그인
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError || !data.user) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      // 2. dealer_users에서 권한 확인
      const { data: dealerUser, error: duError } = await supabase
        .from('dealer_users')
        .select('*, dealers(status)')
        .eq('auth_user_id', data.user.id)
        .single()

      if (duError || !dealerUser) {
        await supabase.auth.signOut()
        setError('거래처 권한이 없는 계정입니다.')
        return
      }

      // 3. 활성 상태 확인
      if (!dealerUser.is_active) {
        await supabase.auth.signOut()
        setError('비활성화된 계정입니다. 영업담당에게 문의해주세요.')
        return
      }

      // 4. 거래처 상태 확인
      const dealerStatus = (dealerUser as Record<string, unknown>).dealers as { status: string } | null
      if (!dealerStatus || dealerStatus.status !== 'active') {
        await supabase.auth.signOut()
        if (dealerStatus?.status === 'pending') {
          setError('가입승인 대기 중입니다. 승인 완료 후 로그인해주세요.')
        } else if (dealerStatus?.status === 'suspended') {
          setError('정지된 거래처입니다. 영업담당에게 문의해주세요.')
        } else {
          setError('거래처 상태를 확인할 수 없습니다.')
        }
        return
      }

      // 5. last_login_at 업데이트
      await supabase
        .from('dealer_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', dealerUser.id)

      // 6. 대시보드로 이동
      router.push('/dealer')
      router.refresh()
    } catch {
      setError('로그인 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900">iPC Mall</h1>
          <p className="text-sm text-zinc-500">거래처 전용</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@company.com"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm">
            <div>
              <Link href="/dealer/signup" className="text-blue-600 hover:underline">
                처음이세요? 가입신청 &rarr;
              </Link>
            </div>
            <div>
              <Link
                href="/dealer/forgot-password"
                className="text-zinc-500 hover:underline"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
