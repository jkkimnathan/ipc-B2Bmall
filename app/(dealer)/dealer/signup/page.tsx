/**
 * 거래처 가입신청 페이지 (공개)
 * 로그인 없이 접근 가능.
 */
import Link from 'next/link'
import DealerSignupForm from '@/components/dealer/DealerSignupForm'

export default function DealerSignupPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">iPC Mall 거래처 가입신청</h1>
          <p className="text-sm text-zinc-500 mt-1">인텍앤컴퍼니 iPC 브랜드 파트너</p>
        </div>

        {/* 안내 */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 mb-6 space-y-1">
          <p>- 가입신청 후 영업담당 검토를 거쳐 1~2영업일 내 승인됩니다.</p>
          <p>- 승인 시 입력하신 이메일로 임시 비밀번호가 전달됩니다.</p>
          <p>- 정확한 사업자 정보를 입력해주세요.</p>
        </div>

        {/* 폼 */}
        <DealerSignupForm />

        {/* 하단 링크 */}
        <div className="text-center mt-8 text-sm text-zinc-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/dealer/login" className="text-blue-600 hover:underline font-medium">
            로그인
          </Link>
        </div>
      </div>
    </div>
  )
}
