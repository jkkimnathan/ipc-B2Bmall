-- 발주 이력 타임라인 (감사로그)
-- 모든 상태 변경, 메모, 납기 변경 등을 기록하여 추적 가능하게 한다.
create table if not exists order_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  event_type text not null check (event_type in (
    'submitted',        -- 거래처가 발주 제출
    'dealer_updated',   -- 거래처가 1시간 내 수정
    'dealer_canceled',  -- 거래처가 1시간 내 취소
    'approved',         -- 관리자 승인
    'rejected',         -- 관리자 반려
    'ship_date_set',    -- 출고예정일 지정/변경
    'in_production',    -- 생산 시작
    'shipped',          -- 출고 완료
    'completed',        -- 거래 완료
    'admin_canceled',   -- 관리자 취소
    'admin_memo',       -- 관리자 메모 추가/수정
    'note'              -- 기타 기록
  )),
  actor_type text not null check (actor_type in ('dealer', 'admin', 'system')),
  actor_id uuid,          -- dealer_users.id 또는 auth.users.id
  actor_name text,        -- 스냅샷 (거래처가 삭제되어도 이력은 남음)

  -- 상태 변경 추적
  from_status text,
  to_status text,

  -- 이벤트 상세
  message text,                            -- 사람이 읽는 설명
  metadata jsonb,                          -- 추가 데이터 (변경된 필드 등)
  is_visible_to_dealer boolean default true, -- 거래처에 노출 여부

  created_at timestamptz default now()
);

create index if not exists idx_order_events_order on order_events(order_id, created_at desc);
create index if not exists idx_order_events_type on order_events(event_type);
