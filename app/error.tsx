'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-zinc-300">오류</h1>
      <p className="text-lg text-zinc-600">문제가 발생했습니다.</p>
      <p className="max-w-md text-center text-sm text-zinc-400">
        {error.message || '알 수 없는 오류가 발생했습니다.'}
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        다시 시도
      </button>
    </div>
  )
}
