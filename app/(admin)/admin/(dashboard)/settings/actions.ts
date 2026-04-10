'use server'

/**
 * 관리자 설정 서버 액션
 */
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { formatDateTime } from '@/lib/utils/format'
import TestEmail from '@/components/emails/TestEmail'

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

/** 알림 설정 저장 */
export async function updateNotificationSettings(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()

  const booleanKeys = [
    'dealer_order_submitted',
    'dealer_order_approved',
    'dealer_order_rejected',
    'dealer_order_shipped',
    'dealer_rfq_submitted',
    'dealer_quote_sent',
    'dealer_dealer_approved',
    'admin_new_dealer',
    'admin_new_order',
    'admin_new_rfq',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const key of booleanKeys) {
    updates[key] = formData.get(key) === 'on'
  }
  updates.admin_notification_emails = (formData.get('admin_notification_emails') as string)?.trim() || null
  updates.sender_name = (formData.get('sender_name') as string)?.trim() || 'iPC Mall'
  updates.sender_email = (formData.get('sender_email') as string)?.trim() || 'noreply@ipcb2bmall.com'

  // upsert
  const { error } = await supabase
    .from('notification_settings')
    .upsert({ id: SETTINGS_ID, ...updates })

  if (error) throw new Error('설정 저장 실패: ' + error.message)

  revalidatePath('/admin/settings')
}

/** 테스트 이메일 발송 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()

  if (!to?.trim()) throw new Error('수신 이메일 주소를 입력해주세요.')

  const result = await sendEmail({
    templateKey: 'test',
    to: to.trim(),
    recipientType: 'admin',
    recipientName: admin.email ?? '',
    subject: '[iPC Mall] 이메일 발송 테스트',
    react: TestEmail({
      recipientName: admin.email ?? '관리자',
      sentAt: formatDateTime(new Date().toISOString()),
    }),
  })

  revalidatePath('/admin/settings')
  return result
}
