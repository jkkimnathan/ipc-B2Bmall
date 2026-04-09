-- ============================================================
-- 견적 요청(RFQ) 테이블 보강
-- spec_json (구조화된 사양), 배송 정보, 다중 첨부파일 지원
-- ============================================================

-- 구조화된 사양 JSON 추가
alter table quote_requests add column if not exists spec_json jsonb not null default '{}'::jsonb;

-- 배송 관련 컬럼 (발주 전환 시 사용)
alter table quote_requests add column if not exists shipping_address_id uuid references dealer_addresses(id);
alter table quote_requests add column if not exists shipping_label text;
alter table quote_requests add column if not exists shipping_recipient text;
alter table quote_requests add column if not exists shipping_phone text;
alter table quote_requests add column if not exists shipping_postal_code text;
alter table quote_requests add column if not exists shipping_address text;
alter table quote_requests add column if not exists shipping_address_detail text;
alter table quote_requests add column if not exists shipping_memo text;

-- 다중 첨부파일 지원 (기존 attachment_url → attachment_urls 배열)
alter table quote_requests drop column if exists attachment_url;
alter table quote_requests add column if not exists attachment_urls text[] not null default '{}';

-- spec_json GIN 인덱스
create index if not exists idx_rfq_spec on quote_requests using gin (spec_json);
