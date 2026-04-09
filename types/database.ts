/**
 * iPC Mall B2B 시스템 - 데이터베이스 타입 정의
 * Supabase 7개 테이블에 대응하는 TypeScript 인터페이스
 */

// ============================================================
// 공통 상태값 타입
// ============================================================

/** 거래처 상태: pending(승인대기), active(활성), suspended(정지) */
export type DealerStatus = 'pending' | 'active' | 'suspended'

/** PC 카테고리: Business / Pro / Master */
export type PcCategory = 'business' | 'pro' | 'master'

/** 재고 상태: in_stock(재고있음), low_stock(재고부족), out_of_stock(품절), made_to_order(주문생산) */
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'made_to_order'

/** 발주 상태: submitted(제출) → approved(승인) → in_production(생산중) → shipped(출하) → completed(완료) */
export type OrderStatus =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'in_production'
  | 'shipped'
  | 'completed'
  | 'canceled'

/** 견적요청 상태: submitted(제출) → quoted(견적완료) → accepted(수락) → converted_to_order(발주전환) */
export type RfqStatus =
  | 'submitted'
  | 'quoted'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted_to_order'
  | 'canceled'

/** 견적서 상태: draft(작성중) → sent(발송) → accepted(수락) / rejected(거절) / expired(만료) */
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

// ============================================================
// 테이블 인터페이스
// ============================================================

/** 거래처 - 인텍앤컴퍼니와 거래하는 유통사/거래처 */
export interface Dealer {
  id: string
  company_name: string
  business_no: string
  ceo_name: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  postal_code: string | null
  business_type: string | null
  business_item: string | null
  erp_code: string | null
  status: DealerStatus
  business_cert_url: string | null
  rejection_reason: string | null
  memo: string | null
  created_at: string
  approved_at: string | null
}

/** 거래처 로그인 계정 - 거래처에 소속된 사용자 */
export interface DealerUser {
  id: string
  dealer_id: string
  auth_user_id: string | null
  login_id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  is_primary: boolean
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

/** 부품 슬롯 (이름 + 수량) */
export interface PartSlot {
  name: string
  qty: number
}

/** ETC 슬롯 (라벨 + 이름 + 수량) */
export interface EtcSlot {
  label: string
  name: string
  qty: number
}

/** 표준 PC 사양 (spec_json 컬럼 구조) */
export interface StandardPcSpec {
  cpu: PartSlot
  mb: PartSlot
  gpu: PartSlot
  cooler: PartSlot
  ram: PartSlot
  ssd: PartSlot
  hdd: PartSlot
  case: PartSlot
  psu: PartSlot
  os: PartSlot
  as: PartSlot
  etc: EtcSlot[]
}

/** 빈 사양 객체 생성 헬퍼 */
export function createEmptySpec(): StandardPcSpec {
  const emptySlot = (): PartSlot => ({ name: '', qty: 0 })
  return {
    cpu: emptySlot(), mb: emptySlot(), gpu: emptySlot(),
    cooler: emptySlot(), ram: emptySlot(), ssd: emptySlot(),
    hdd: emptySlot(), case: emptySlot(), psu: emptySlot(),
    os: emptySlot(), as: emptySlot(),
    etc: [],
  }
}

/** 표준 PC - iPC 브랜드 표준 PC 카탈로그 */
export interface StandardPc {
  id: string
  sku: string
  name: string
  category: PcCategory
  description: string | null
  spec_json: StandardPcSpec
  thumbnail_urls: string[]
  detail_image_url: string | null
  sale_price: number
  stock_status: StockStatus
  lead_time_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/** 거래처 배송지 주소록 */
export interface DealerAddress {
  id: string
  dealer_id: string
  label: string
  recipient_name: string
  phone: string
  postal_code: string | null
  address: string
  address_detail: string | null
  is_default: boolean
  memo: string | null
  created_at: string
  updated_at: string
}

/** 장바구니 항목 */
export interface CartItem {
  id: string
  dealer_id: string
  standard_pc_id: string
  quantity: number
  created_at: string
  updated_at: string
}

/** 발주서 - 거래처가 표준 PC를 발주할 때 생성 */
export interface Order {
  id: string
  order_no: string
  dealer_id: string
  dealer_user_id: string | null
  status: OrderStatus
  total_amount: number
  dealer_memo: string | null
  admin_memo: string | null
  expected_ship_date: string | null
  submitted_at: string
  approved_at: string | null
  shipped_at: string | null
  shipping_address_id: string | null
  shipping_label: string | null
  shipping_recipient: string | null
  shipping_phone: string | null
  shipping_postal_code: string | null
  shipping_address: string | null
  shipping_address_detail: string | null
  shipping_memo: string | null
  desired_ship_date: string | null
}

/** 발주 항목 - 발주에 포함된 개별 PC 항목 (가격/이름 스냅샷 포함) */
export interface OrderItem {
  id: string
  order_id: string
  standard_pc_id: string | null
  pc_name_snapshot: string
  unit_price_snapshot: number
  quantity: number
  subtotal: number
  source_type: 'standard' | 'quote'
  source_quote_id: string | null
}

/** 견적 요청 (RFQ) - 거래처가 맞춤 사양이나 대량 구매 견적을 요청 */
export interface QuoteRequest {
  id: string
  rfq_no: string
  dealer_id: string
  dealer_user_id: string | null
  title: string
  purpose: string | null
  quantity: number
  budget_per_unit: number | null
  desired_ship_date: string | null
  requirements: string
  spec_json: StandardPcSpec
  attachment_urls: string[]
  // 배송 정보 스냅샷
  shipping_address_id: string | null
  shipping_label: string | null
  shipping_recipient: string | null
  shipping_phone: string | null
  shipping_postal_code: string | null
  shipping_address: string | null
  shipping_address_detail: string | null
  shipping_memo: string | null
  status: RfqStatus
  submitted_at: string
  updated_at: string
}

// ============================================================
// 발주 이력 (감사로그) 타입
// ============================================================

/** 발주 이벤트 타입 */
export type OrderEventType =
  | 'submitted' | 'dealer_updated' | 'dealer_canceled'
  | 'approved' | 'rejected' | 'ship_date_set'
  | 'in_production' | 'shipped' | 'completed'
  | 'admin_canceled' | 'admin_memo' | 'note'

/** 이벤트 행위자 유형 */
export type ActorType = 'dealer' | 'admin' | 'system'

/** 발주 이벤트 - order_events 테이블 */
export interface OrderEvent {
  id: string
  order_id: string
  event_type: OrderEventType
  actor_type: ActorType
  actor_id: string | null
  actor_name: string | null
  from_status: string | null
  to_status: string | null
  message: string | null
  metadata: Record<string, unknown> | null
  is_visible_to_dealer: boolean
  created_at: string
}

/** 견적서 회신 - 관리자가 견적 요청에 대해 작성한 견적서 */
export interface Quote {
  id: string
  quote_no: string
  rfq_id: string
  proposed_spec: string
  spec_json: StandardPcSpec
  unit_price: number
  quantity: number
  total_amount: number
  vat_included: boolean
  lead_time_days: number
  valid_until: string
  admin_memo: string | null
  status: QuoteStatus
  sent_at: string | null
  responded_at: string | null
  converted_order_id: string | null
  created_at: string
}

// ============================================================
// RFQ 이력 (감사로그) 타입
// ============================================================

/** RFQ 이벤트 타입 */
export type RfqEventType =
  | 'submitted' | 'dealer_updated' | 'dealer_canceled'
  | 'quote_draft_saved' | 'quote_sent' | 'quote_revised'
  | 'accepted' | 'rejected_by_dealer' | 'expired'
  | 'converted_to_order' | 'admin_memo' | 'note'

/** RFQ 이벤트 - rfq_events 테이블 */
export interface RfqEvent {
  id: string
  rfq_id: string
  quote_id: string | null
  event_type: RfqEventType
  actor_type: ActorType
  actor_id: string | null
  actor_name: string | null
  from_status: string | null
  to_status: string | null
  message: string | null
  metadata: Record<string, unknown> | null
  is_visible_to_dealer: boolean
  created_at: string
}

// ============================================================
// 이메일 발송 로그
// ============================================================

export type EmailLogStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface EmailLog {
  id: string
  template_key: string
  recipient_type: 'dealer' | 'admin'
  recipient_email: string
  recipient_name: string | null
  subject: string
  related_order_id: string | null
  related_rfq_id: string | null
  related_dealer_id: string | null
  status: EmailLogStatus
  provider_message_id: string | null
  error_message: string | null
  attempted_at: string
  sent_at: string | null
}

// ============================================================
// 알림 설정 (시스템 전역)
// ============================================================

export interface NotificationSettings {
  id: string
  dealer_order_submitted: boolean
  dealer_order_approved: boolean
  dealer_order_rejected: boolean
  dealer_order_shipped: boolean
  dealer_rfq_submitted: boolean
  dealer_quote_sent: boolean
  dealer_dealer_approved: boolean
  admin_new_dealer: boolean
  admin_new_order: boolean
  admin_new_rfq: boolean
  admin_notification_emails: string | null
  sender_name: string
  sender_email: string
  updated_at: string
}
