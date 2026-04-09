/**
 * Resend 클라이언트 싱글톤
 * RESEND_API_KEY가 없으면 null 반환 (로컬 테스트 환경)
 */
import { Resend } from 'resend'

let _client: Resend | null = null

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!_client) _client = new Resend(key)
  return _client
}
