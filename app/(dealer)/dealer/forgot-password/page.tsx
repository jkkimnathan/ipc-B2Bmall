'use client'

/**
 * 비밀번호 찾기 페이지
 * 이메일 입력 → Supabase Auth 비밀번호 재설정 링크 발송
 */
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const siteUrl = window.location.origin

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${siteUrl}/dealer/reset-password` },
      )

      if (resetError) {
        setError('요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        return
      }

      setSent(true)
    } catch {
      setError('요청 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-zinc-900">이메일을 확인해주세요</h1>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-zinc-600">
              <strong>{email}</strong>으로 비밀번호 재설정 링크를 발송했습니다.
            </p>
            <p className="text-xs text-zinc-400">
              이메일이 도착하지 않으면 스팸 폴더를 확인하거나 다시 시도해주세요.
            </p>
            <div className="pt-2">
              <Link href="/dealer/login" className="text-sm text-blue-600 hover:underline">
                로그인 페이지로 돌아가기
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900">비밀번호 찾기</h1>
          <p className="text-sm text-zinc-500">
            가입한 이메일을 입력하시면 재설정 링크를 보내드립니다.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '발송 중...' : '재설정 링크 발송'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/dealer/login" className="text-sm text-zinc-500 hover:underline">
              로그인 페이지로 돌아가기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
