-- ============================================================
-- 견적서(quotes) 테이블 보강 + RFQ 이력 테이블
-- ============================================================

-- quotes 테이블에 구조화된 사양 JSON 추가
alter table quotes add column if not exists spec_json jsonb not null default '{}'::jsonb;

-- RFQ 이력 테이블 (order_events와 유사 구조)
create table if not exists rfq_events (
  id uuid primary key default uuid_generate_v4(),
  rfq_id uuid not null references quote_requests(id) on delete cascade,
  quote_id uuid references quotes(id) on delete set null,
  event_type text not null check (event_type in (
    'submitted',          -- 거래처가 RFQ 제출
    'dealer_updated',     -- 거래처가 RFQ 수정
    'dealer_canceled',    -- 거래처가 RFQ 취소
    'quote_draft_saved',  -- 관리자가 견적서 임시저장
    'quote_sent',         -- 관리자가 견적서 발송
    'quote_revised',      -- 관리자가 재견적 발송
    'accepted',           -- 거래처가 견적 수락 (6-C)
    'rejected_by_dealer', -- 거래처가 견적 거절 (6-C)
    'expired',            -- 견적서 만료 (6-C)
    'converted_to_order', -- 발주 전환 (6-C)
    'admin_memo',         -- 관리자 메모
    'note'
  )),
  actor_type text not null check (actor_type in ('dealer', 'admin', 'system')),
  actor_id uuid,
  actor_name text,
  from_status text,
  to_status text,
  message text,
  metadata jsonb,
  is_visible_to_dealer boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_rfq_events_rfq on rfq_events(rfq_id, created_at desc);
create index if not exists idx_rfq_events_type on rfq_events(event_type);
