/**
 * 공통 포맷 유틸리티
 * 원화, 날짜, 카테고리, 재고 상태, 부품 슬롯 등의 표시를 통일한다.
 */
import type { PartSlot } from '@/types/database'

// ============================================================
// 시간대 / 입력 검증 공용 헬퍼
// 한국 B2B 서비스는 UTC 인프라에 배포되더라도 모든 날짜 경계·표시를
// KST(Asia/Seoul) 기준으로 계산해야 한다.
// ============================================================
const KST = 'Asia/Seoul'

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
export function kstToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

/** KST 기준 날짜 문자열 (YYYYMMDD) */
export function kstDateCompact(date: Date = new Date()): string {
  return kstTodayFrom(date).replace(/-/g, '')
}

function kstTodayFrom(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

/** KST 기준 시:분:초 (HHMMSS) */
export function kstTimeCompact(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: KST, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date).replace(/:/g, '')
}

/**
 * FormData 값을 안전한 정수로 파싱한다.
 * NaN/Infinity/소수/범위밖이면 null 을 반환하여 호출부에서 검증 실패로 처리.
 */
export function toSafeInt(
  value: FormDataEntryValue | string | number | null | undefined,
  opts?: { min?: number; max?: number },
): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isInteger(n)) return null
  const min = opts?.min ?? 0
  const max = opts?.max ?? Number.MAX_SAFE_INTEGER
  if (n < min || n > max) return null
  return n
}

/**
 * PostgREST .or()/.ilike() 검색어에서 필터 구문 메타문자를 제거한다.
 * 쉼표/괄호는 or 그룹 구조를 깨뜨릴 수 있으므로 공백으로 치환하고 길이를 제한한다.
 */
export function sanitizeSearch(q: string | null | undefined): string {
  if (!q) return ''
  return q.replace(/[,()]/g, ' ').trim().slice(0, 100)
}

/** 이메일 형식 검증 (단순 RFC 근사) */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/** 원화 포맷 (1234567 → "1,234,567원"). null/소수 안전 처리. */
export function formatKRW(amount: number | null | undefined): string {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? Math.round(amount) : 0
  return n.toLocaleString('ko-KR') + '원'
}

/** 날짜+시간 포맷 (KST 기준, "2026.04.08 12:34") */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    timeZone: KST,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

/** 날짜 포맷 (KST 기준, "2026.04.08") */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', {
    timeZone: KST,
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

/** 카테고리 한글 라벨 */
export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    business: 'iPC Business',
    pro: 'iPC Pro',
    master: 'iPC Master',
    aipc: 'iPC AI',
  }
  return map[category] ?? category
}

// ============================================================
// 리퍼 부품 관련 유틸
// ============================================================

/** 리퍼 부품 종류 한글 라벨 */
export function partTypeLabel(type: string): string {
  const map: Record<string, string> = {
    cpu: 'CPU',
    gpu: '그래픽카드',
    ram: '메모리(RAM)',
    ssd: 'SSD',
    hdd: 'HDD',
    mb: '메인보드',
    psu: '파워',
    case: '케이스',
    cooler: '쿨러',
    monitor: '모니터',
    etc: '기타',
  }
  return map[type] ?? type
}

/** 리퍼 등급 한글 라벨 + 색상 + 설명 */
export function conditionGradeLabel(grade: string): { label: string; color: string; desc: string } {
  const map: Record<string, { label: string; color: string; desc: string }> = {
    S: { label: 'S급 (최상)', color: 'green', desc: '외관/성능 신품에 준함' },
    A: { label: 'A급 (상)', color: 'blue', desc: '미세 사용감, 성능 이상 없음' },
    B: { label: 'B급 (중)', color: 'yellow', desc: '사용감 있으나 정상 작동' },
  }
  return map[grade] ?? { label: grade, color: 'gray', desc: '' }
}

/** 할인율 계산 (신품 시세 대비, 0~100 정수). 시세 없으면 null */
export function discountRate(marketPrice: number | null, salePrice: number): number | null {
  if (!marketPrice || marketPrice <= 0 || salePrice >= marketPrice) return null
  return Math.round((1 - salePrice / marketPrice) * 100)
}

/** 재고 상태 한글 라벨 + 색상 */
export function stockStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    in_stock: { label: '재고 충분', color: 'green' },
    low_stock: { label: '재고 부족', color: 'yellow' },
    out_of_stock: { label: '재고 없음', color: 'red' },
    made_to_order: { label: '주문 제작', color: 'blue' },
  }
  return map[status] ?? { label: status, color: 'gray' }
}

/**
 * 부품 슬롯 한 줄 표시
 * qty > 1이면 "x N" 붙임, qty=0이거나 빈 이름이면 "—"
 */
export function formatPartSlot(slot: PartSlot): string {
  if (!slot.name || slot.qty === 0) return '—'
  return slot.qty > 1 ? `${slot.name} x ${slot.qty}` : slot.name
}

// ============================================================
// 거래처 관련 유틸
// ============================================================

/** 거래처 상태 한글 라벨 + 색상 */
export function dealerStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: '승인대기', color: 'yellow' },
    active: { label: '활성', color: 'green' },
    suspended: { label: '정지', color: 'red' },
  }
  return map[status] ?? { label: status, color: 'gray' }
}

/** 사업자번호 포맷 (1234567890 → "123-45-67890") */
export function formatBusinessNo(no: string): string {
  const digits = no.replace(/\D/g, '')
  if (digits.length !== 10) return no
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

/**
 * 한국 사업자번호 체크섬 검증
 * 10자리 숫자, 가중치 배열로 검증합니다.
 */
export function isValidBusinessNo(no: string): boolean {
  const digits = no.replace(/\D/g, '')
  if (digits.length !== 10) return false

  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
  let sum = 0

  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * weights[i]
  }

  // 9번째 자리(인덱스 8)의 가중치 5 곱한 후 10으로 나눈 몫도 더함
  sum += Math.floor((parseInt(digits[8], 10) * 5) / 10)

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(digits[9], 10)
}

/** 임시 비밀번호 생성 (영문 대소문자 + 숫자 12자리) */
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let result = ''
  const array = new Uint8Array(12)
  crypto.getRandomValues(array)
  for (let i = 0; i < 12; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

// ============================================================
// 발주 관련 유틸
// ============================================================

/** 발주 상태 한글 라벨 + 색상 */
export function orderStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    submitted: { label: '접수대기', color: 'yellow' },
    approved: { label: '승인완료', color: 'blue' },
    rejected: { label: '반려', color: 'red' },
    in_production: { label: '생산중', color: 'purple' },
    shipped: { label: '출고완료', color: 'green' },
    completed: { label: '거래완료', color: 'gray' },
    canceled: { label: '취소', color: 'red' },
  }
  return map[status] ?? { label: status, color: 'gray' }
}

/** 거래처가 발주를 수정/취소할 수 있는지 (1시간 이내 + submitted 상태) */
export function canEditOrder(order: { status: string; submitted_at: string }): boolean {
  if (order.status !== 'submitted') return false
  return getEditableMinutesLeft(order.submitted_at) > 0
}

/** 발주 수정 가능 남은 시간 (분, 0 이하면 불가) */
export function getEditableMinutesLeft(submittedAt: string): number {
  const submitted = new Date(submittedAt).getTime()
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  return Math.floor((submitted + oneHour - now) / (60 * 1000))
}

/** 전화번호 포맷 (01012345678 → 010-1234-5678) */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return phone
}

/** 주소 한 줄 표시 */
export function formatAddress(addr: { postal_code?: string | null; address: string; address_detail?: string | null }): string {
  const parts: string[] = []
  if (addr.postal_code) parts.push(`(${addr.postal_code})`)
  parts.push(addr.address)
  if (addr.address_detail) parts.push(addr.address_detail)
  return parts.join(' ')
}

/** 상대 시간 표시 (3분 전, 2시간 전, 어제 등) */
export function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = now - then
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  return formatDate(iso)
}

/**
 * 발주 상태 전환 가능 여부 검사
 * submitted → approved, rejected, admin_canceled
 * approved → in_production, admin_canceled
 * in_production → shipped, admin_canceled
 * shipped → completed
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ['approved', 'rejected', 'canceled'],
  approved: ['in_production', 'canceled'],
  in_production: ['shipped', 'canceled'],
  shipped: ['completed'],
}

export function canTransitionTo(currentStatus: string, nextStatus: string): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false
}

// ============================================================
// 견적 요청(RFQ) 관련 유틸
// ============================================================

/** RFQ 상태 한글 라벨 + 색상 */
export function rfqStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    submitted: { label: '회신대기', color: 'yellow' },
    quoted: { label: '견적수신', color: 'blue' },
    accepted: { label: '수락', color: 'green' },
    rejected: { label: '거절', color: 'red' },
    expired: { label: '만료', color: 'gray' },
    converted_to_order: { label: '발주전환', color: 'purple' },
    canceled: { label: '취소', color: 'gray' },
  }
  return map[status] ?? { label: status, color: 'gray' }
}

/** RFQ를 거래처가 수정할 수 있는지 (submitted 상태일 때만) */
export function canEditRfq(rfq: { status: string }): boolean {
  return rfq.status === 'submitted'
}

/** RFQ 번호 생성 (RFQ-YYYYMMDD-HHMMSS-XXXX, KST 기준) */
export function generateRfqNo(): string {
  const now = new Date()
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `RFQ-${kstDateCompact(now)}-${kstTimeCompact(now)}-${rand}`
}

/** 용도 한글 라벨 */
export function purposeLabel(purpose: string): string {
  const map: Record<string, string> = {
    office: '사무용',
    development: '개발/설계',
    video_editing: '영상편집',
    rendering: '3D 렌더링',
    gaming: '게이밍',
    server: '서버',
    etc: '기타',
  }
  return map[purpose] ?? purpose
}

/** 견적서(Quote) 상태 한글 라벨 + 색상 */
export function quoteStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: '작성중', color: 'gray' },
    sent: { label: '발송완료', color: 'blue' },
    accepted: { label: '수락', color: 'green' },
    rejected: { label: '거절', color: 'red' },
    expired: { label: '만료', color: 'gray' },
  }
  return map[status] ?? { label: status, color: 'gray' }
}

/** 유효기한 계산 (KST 오늘 + N일, YYYY-MM-DD). 한국은 DST 없음. */
export function calcValidUntil(days: number): string {
  const n = Number.isFinite(days) ? Math.trunc(days) : 7
  const [y, m, d] = kstToday().split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCDate(base.getUTCDate() + n)
  return base.toISOString().slice(0, 10)
}

/** 부품 슬롯 키 → 한글 라벨 */
export function partLabel(key: string): string {
  const map: Record<string, string> = {
    cpu: 'CPU',
    mb: '메인보드',
    gpu: '그래픽카드',
    cooler: '쿨러',
    ram: 'RAM',
    ssd: 'SSD',
    hdd: 'HDD',
    case: '케이스',
    psu: '파워',
    os: '운영체제',
    as: 'A/S',
  }
  return map[key] ?? key
}
