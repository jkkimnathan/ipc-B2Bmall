/**
 * 발주번호 생성 — 서버 사이드 전용
 *
 * 형식: PO-YYYYMMDD-NNNN (KST 날짜 기준)
 * 전역 원자적 시퀀스(next_doc_seq RPC)로 채번하여 거래처 간 충돌을 방지한다.
 * (기존 count 기반 방식은 RLS로 거래처별 카운트만 집계되어 전역 unique 제약과
 *  충돌했다 — 018 마이그레이션의 doc_counters/next_doc_seq 참조)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { kstDateCompact } from '@/lib/utils/format'

/**
 * @param client next_doc_seq 를 실행할 수 있는 클라이언트(service_role 권장).
 */
export async function generateOrderNo(client: SupabaseClient): Promise<string> {
  const dateStr = kstDateCompact()
  const { data: seq, error } = await client.rpc('next_doc_seq', { p_key: `order:${dateStr}` })
  if (error || seq == null) {
    throw new Error('발주번호 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
  return `PO-${dateStr}-${String(seq).padStart(4, '0')}`
}
