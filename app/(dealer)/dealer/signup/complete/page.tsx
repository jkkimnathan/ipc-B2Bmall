/**
 * 가입신청 완료 페이지
 */
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SignupCompletePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <CheckCircle className="size-16 text-green-500 mx-auto" />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900">가입신청 완료</h1>
          <p className="text-sm text-zinc-500">
            가입신청이 정상적으로 접수되었습니다.
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6 text-sm text-zinc-600 space-y-2 text-left">
          <p>- 영업담당 검토 후 1~2영업일 내 결과를 이메일로 안내드립니다.</p>
          <p>- 승인 시 등록하신 이메일로 임시 비밀번호가 발송됩니다.</p>
          <p>- 추가 문의: <a href="mailto:nathan@intechn.com" className="text-blue-600 hover:underline">nathan@intechn.com</a></p>
          <p>- 전화: 02-2129-7935</p>
        </div>

        <Button size="lg" render={<Link href="/" />}>
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  )
}
