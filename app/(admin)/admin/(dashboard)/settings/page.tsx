/**
 * 관리자 설정 페이지
 *
 * 탭 3개: 일반 설정, 이메일 토글, 발송 로그
 */
import { createClient } from '@/lib/supabase/server'
import { getNotificationSettings } from '@/lib/email/settings'
import SettingsClient from '@/components/admin/settings/SettingsClient'
import type { EmailLog, NotificationSettings } from '@/types/database'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const settings = await getNotificationSettings()

  // 최근 발송 로그 100건
  const { data: logs } = await supabase
    .from('email_logs')
    .select('*')
    .order('attempted_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">설정</h1>
      <SettingsClient
        settings={settings}
        logs={(logs ?? []) as EmailLog[]}
      />
    </div>
  )
}
