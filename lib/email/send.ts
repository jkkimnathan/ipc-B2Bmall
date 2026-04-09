/**
 * 이메일 발송 유틸 — 서버 사이드 전용
 *
 * 모든 이메일 발송은 이 함수를 통해 실행한다.
 * 발송 실패 시에도 throw하지 않고, 로그만 남긴다.
 */
import type { ReactElement } from 'react'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
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
    const resend = getResendClient()
    if (!resend) {
      console.warn('[sendEmail] RESEND_API_KEY 미설정 — 이메일 발송 스킵')
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
          error_message: 'RESEND_API_KEY 미설정',
        })
      }
      return { success: true }
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
