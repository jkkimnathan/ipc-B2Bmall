/**
 * 견적서 유효기한 관련 헬퍼 (클라이언트/서버 공용)
 */

/** 견적서가 만료되었는지 확인 (valid_until < 오늘) */
export function isQuoteExpired(validUntil: string): boolean {
  return daysUntilExpiry(validUntil) < 0
}

/** 만료까지 남은 일수 (음수면 이미 만료) */
export function daysUntilExpiry(validUntil: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const until = new Date(validUntil + 'T00:00:00')
  return Math.floor((until.getTime() - today.getTime()) / 86400000)
}

/** 만료 표시 라벨 */
export function expiryLabel(validUntil: string): { label: string; color: string } {
  const days = daysUntilExpiry(validUntil)
  if (days < 0) return { label: '만료됨', color: 'red' }
  if (days <= 3) return { label: `D-${days} 임박`, color: 'yellow' }
  return { label: '유효', color: 'green' }
}
