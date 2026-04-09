/**
 * Supabase 브라우저(클라이언트) 클라이언트
 *
 * 용도: 클라이언트 컴포넌트('use client')에서 Supabase에 접근할 때 사용.
 * 사용 예시:
 *   import { createClient } from '@/lib/supabase/client'
 *   const supabase = createClient()
 *   const { data } = await supabase.from('dealers').select('*')
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
