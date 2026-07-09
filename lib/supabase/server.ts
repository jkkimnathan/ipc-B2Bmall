/**
 * Supabase 서버 클라이언트
 *
 * 용도: 서버 컴포넌트, Route Handler, Server Action에서 Supabase에 접근할 때 사용.
 *       쿠키를 통해 사용자 세션을 자동으로 처리함.
 * 사용 예시:
 *   import { createClient } from '@/lib/supabase/server'
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('orders').select('*')
 */
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 서버 컴포넌트에서 쿠키 설정 시 발생할 수 있는 에러 무시.
            // 미들웨어에서 세션 갱신을 처리하므로 안전함.
          }
        },
      },
    }
  )
}
