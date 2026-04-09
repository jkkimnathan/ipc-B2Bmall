import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-zinc-300">404</h1>
      <p className="text-lg text-zinc-600">페이지를 찾을 수 없습니다.</p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
