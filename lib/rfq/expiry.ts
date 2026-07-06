/**
 * 견적서 유효기한 관련 헬퍼 (클라이언트/서버 공용)
 *
 * 모든 비교는 KST(Asia/Seoul) 기준 오늘 날짜와 valid_until(YYYY-MM-DD)을
 * "날짜 문자열"로 비교한다. Date 의 런타임 로컬 타임존 의존을 제거하여
 * 서버(UTC)와 브라우저(KST)가 동일한 만료 판정을 내리도록 한다.
 */
import { kstToday } from '@/lib/utils/format'

/** 견적서가 만료되었는지 확인 (valid_until < KST 오늘) */
export function isQuoteExpired(validUntil: string): boolean {
  return daysUntilExpiry(validUntil) < 0
}

/** 만료까지 남은 일수 (음수면 이미 만료). KST 자정 기준. */
export function daysUntilExpiry(validUntil: string): number {
  const today = kstToday() // YYYY-MM-DD (KST)
  const [ty, tm, td] = today.split('-').map(Number)
  const [uy, um, ud] = validUntil.split('-').map(Number)
  const todayUtc = Date.UTC(ty, tm - 1, td)
  const untilUtc = Date.UTC(uy, um - 1, ud)
  return Math.round((untilUtc - todayUtc) / 86400000)
}

/** 만료 표시 라벨 */
export function expiryLabel(validUntil: string): { label: string; color: string } {
  const days = daysUntilExpiry(validUntil)
  if (days < 0) return { label: '만료됨', color: 'red' }
  if (days <= 3) return { label: `D-${days} 임박`, color: 'yellow' }
  return { label: '유효', color: 'green' }
}
