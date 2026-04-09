/**
 * 거래처 직접 등록 페이지
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import DealerForm from '@/components/admin/dealers/DealerForm'

export default function NewDealerPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/dealers" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 w-fit">
        <ArrowLeft className="size-4" />
        목록으로
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900">거래처 직접 등록</h1>
        <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          이 페이지로 등록하면 즉시 활성 상태가 되며, 첫 담당자 계정이 자동 발급됩니다.
        </div>
      </div>

      <DealerForm mode="create" />
    </div>
  )
}
