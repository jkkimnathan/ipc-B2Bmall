/**
 * 알림 설정 조회 유틸 — 서버 사이드 전용
 */
import { createClient } from '@/lib/supabase/server'
import type { NotificationSettings } from '@/types/database'

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

/** 알림 설정 조회 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('id', SETTINGS_ID)
    .single()

  if (data) return data as NotificationSettings

  // 기본값 반환
  return {
    id: SETTINGS_ID,
    dealer_order_submitted: true,
    dealer_order_approved: true,
    dealer_order_rejected: true,
    dealer_order_shipped: true,
    dealer_rfq_submitted: true,
    dealer_quote_sent: true,
    dealer_dealer_approved: true,
    admin_new_dealer: true,
    admin_new_order: true,
    admin_new_rfq: true,
    admin_notification_emails: null,
    sender_name: 'iPC Mall',
    sender_email: 'noreply@ipcb2bmall.com',
    updated_at: new Date().toISOString(),
  }
}

/** 관리자 알림 수신 이메일 목록 */
export async function getAdminNotificationEmails(): Promise<string[]> {
  const settings = await getNotificationSettings()
  if (settings.admin_notification_emails) {
    return settings.admin_notification_emails.split(',').map((e) => e.trim()).filter(Boolean)
  }
  const envEmails = process.env.ADMIN_NOTIFICATION_EMAILS
  if (envEmails) {
    return envEmails.split(',').map((e) => e.trim()).filter(Boolean)
  }
  return []
}

/** 특정 템플릿이 활성화되어 있는지 확인 */
export async function isEmailTemplateEnabled(templateKey: string): Promise<boolean> {
  const settings = await getNotificationSettings()
  const key = templateKey as keyof NotificationSettings
  if (key in settings && typeof settings[key] === 'boolean') {
    return settings[key] as boolean
  }
  return true // 알 수 없는 키는 기본 활성
}
