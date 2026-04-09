-- ============================================================
-- 견적 기반 발주 지원: order_items에 출처 정보 추가
-- ============================================================

-- 견적 기반 발주 항목의 출처 구분
alter table order_items add column if not exists source_type text default 'standard'
  check (source_type in ('standard', 'quote'));

-- 견적 기반일 경우 원본 견적서 ID
alter table order_items add column if not exists source_quote_id uuid references quotes(id);
