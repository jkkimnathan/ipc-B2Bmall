/**
 * Supabase 관리자(Admin) 클라이언트
 *
 * 용도: Service Role 키를 사용하여 RLS(Row Level Security)를 우회해야 할 때 사용.
 *       관리자 전용 기능이나 시스템 레벨 작업에서만 사용할 것.
 * ⚠️ 주의: 이 클라이언트는 서버 측에서만 사용해야 함. 절대 클라이언트에 노출하지 말 것.
 * 사용 예시:
 *   import { createAdminClient } from '@/lib/supabase/admin'
 *   const supabase = createAdminClient()
 *   const { data } = await supabase.from('dealers').update({ status: 'active' }).eq('id', dealerId)
 */
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
