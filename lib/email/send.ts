/**
 * 이메일 발송 유틸 — 서버 사이드 전용
 *
 * 모든 이메일 발송은 이 함수를 통해 실행한다.
 * 발송 실패 시에도 throw하지 않고, 로그만 남긴다.
 */
import 'server-only'
import type { ReactElement } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResendClient } from './client'
import { getNotificationSettings, isEmailTemplateEnabled } from './settings'

export interface SendEmailOptions {
  templateKey: string
  to: string | string[]
  recipientType: 'dealer' | 'admin'
  recipientName?: string
  subject: string
  react: ReactElement
  relatedOrderId?: string
  relatedRfqId?: string
  relatedDealerId?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  // email_logs 는 RLS상 관리자 전용이지만, 거래처 세션에서 발생한 발송(신규 발주/
  // 견적 알림)도 로그를 남겨야 하므로 서비스 롤 클라이언트를 사용한다(서버 전용).
  const supabase = createAdminClient()
  const recipients = Array.isArray(options.to) ? options.to : [options.to]

  try {
    // 1) 템플릿 활성 여부 확인
    const enabled = await isEmailTemplateEnabled(options.templateKey)
    if (!enabled) {
      // 스킵 로그 기록
      for (const email of recipients) {
        await supabase.from('email_logs').insert({
          template_key: options.templateKey,
          recipient_type: options.recipientType,
          recipient_email: email,
          recipient_name: options.recipientName ?? null,
          subject: options.subject,
          related_order_id: options.relatedOrderId ?? null,
          related_rfq_id: options.relatedRfqId ?? null,
          related_dealer_id: options.relatedDealerId ?? null,
          status: 'skipped',
        })
      }
      return { success: true }
    }

    // 2) Resend 클라이언트 확인
    // 운영 환경에서 키 미설정은 "조용한 스킵"이 아니라 실패로 처리해
    // email_logs(failed)와 반환값으로 알림 누락을 즉시 드러낸다.
    // 로컬/프리뷰 환경에서는 기존대로 skipped 처리.
    const resend = getResendClient()
    if (!resend) {
      const isProduction = process.env.VERCEL_ENV === 'production'
        || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')
      const status = isProduction ? 'failed' : 'skipped'

      console[isProduction ? 'error' : 'warn']('[sendEmail] RESEND_API_KEY 미설정 — 이메일 미발송 (' + status + ')')
      for (const email of recipients) {
        await supabase.from('email_logs').insert({
          template_key: options.templateKey,
          recipient_type: options.recipientType,
          recipient_email: email,
          recipient_name: options.recipientName ?? null,
          subject: options.subject,
          related_order_id: options.relatedOrderId ?? null,
          related_rfq_id: options.relatedRfqId ?? null,
          related_dealer_id: options.relatedDealerId ?? null,
          status,
          error_message: 'RESEND_API_KEY 미설정',
        })
      }
      return isProduction
        ? { success: false, error: 'RESEND_API_KEY 미설정 — 운영 환경에서 이메일을 발송할 수 없습니다.' }
        : { success: true }
    }

    // 3) 발신자 정보
    const settings = await getNotificationSettings()
    const from = `${settings.sender_name} <${settings.sender_email}>`

    // 4) 로그 먼저 기록 (pending)
    const logIds: string[] = []
    for (const email of recipients) {
      const { data } = await supabase.from('email_logs').insert({
        template_key: options.templateKey,
        recipient_type: options.recipientType,
        recipient_email: email,
        recipient_name: options.recipientName ?? null,
        subject: options.subject,
        related_order_id: options.relatedOrderId ?? null,
        related_rfq_id: options.relatedRfqId ?? null,
        related_dealer_id: options.relatedDealerId ?? null,
        status: 'pending',
      }).select('id').single()
      if (data) logIds.push(data.id)
    }

    // 5) Resend API 호출
    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject: options.subject,
      react: options.react,
    })

    if (error) {
      // 실패 로그
      for (const logId of logIds) {
        await supabase.from('email_logs').update({
          status: 'failed',
          error_message: error.message,
        }).eq('id', logId)
      }
      console.error('[sendEmail] 발송 실패:', error.message)
      return { success: false, error: error.message }
    }

    // 6) 성공 로그
    const messageId = data?.id
    for (const logId of logIds) {
      await supabase.from('email_logs').update({
        status: 'sent',
        provider_message_id: messageId ?? null,
        sent_at: new Date().toISOString(),
      }).eq('id', logId)
    }

    return { success: true, messageId: messageId ?? undefined }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sendEmail] 예외 발생:', msg)
    return { success: false, error: msg }
  }
}
