/**
 * 알림 설정 조회 유틸 — 서버 사이드 전용
 *
 * notification_settings 는 RLS상 관리자 전용 테이블이지만, 이 설정은
 * 거래처가 발주/견적을 제출할 때(=거래처 세션)에도 "관리자 알림 발송 여부"를
 * 판단하기 위해 읽어야 한다. 따라서 서비스 롤 클라이언트로 조회한다(서버 전용).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationSettings } from '@/types/database'

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

/** 알림 설정 조회 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('id', SETTINGS_ID)
    .maybeSingle()

  if (data) return data as NotificationSettings

  // 행이 실제로 없는 경우(null, error 없음)에만 기본값을 사용한다.
  // 쿼리 오류(일시적 장애 등)일 때 기본값(모든 토글 ON)으로 fail-open 하면
  // 관리자가 꺼둔 알림이 다시 발송되므로, 오류는 로그로 남긴다.
  if (error) {
    console.error('[getNotificationSettings] 설정 조회 오류 — 기본값 사용:', error.message)
  }

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
    sender_email: 'noreply@intechonline.kr',
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
