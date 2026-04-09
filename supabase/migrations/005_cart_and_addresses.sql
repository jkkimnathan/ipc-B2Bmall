-- ============================================================
-- iPC Mall B2B 시스템 - 장바구니 + 배송지 주소록 + 발주 배송정보
-- 작성일: 2026-04-09
-- ============================================================

-- 거래처 공배지(배송지) 주소록
create table if not exists dealer_addresses (
  id uuid primary key default uuid_generate_v4(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  label text not null,              -- 예: "본사", "부산물류센터"
  recipient_name text not null,     -- 받는 사람
  phone text not null,              -- 연락처
  postal_code text,                 -- 우편번호
  address text not null,            -- 주소
  address_detail text,              -- 상세주소
  is_default boolean default false, -- 기본 배송지 여부
  memo text,                        -- 배송 메모
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 거래처별 기본 주소는 1개만
create unique index if not exists idx_dealer_addresses_default
  on dealer_addresses(dealer_id) where is_default = true;

create index if not exists idx_dealer_addresses_dealer
  on dealer_addresses(dealer_id);

-- 장바구니 (거래처 단위)
create table if not exists cart_items (
  id uuid primary key default uuid_generate_v4(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  standard_pc_id uuid not null references standard_pcs(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (dealer_id, standard_pc_id)
);

create index if not exists idx_cart_items_dealer on cart_items(dealer_id);

-- orders 테이블에 배송 정보 컬럼 추가
alter table orders add column if not exists shipping_address_id uuid references dealer_addresses(id);
alter table orders add column if not exists shipping_label text;
alter table orders add column if not exists shipping_recipient text;
alter table orders add column if not exists shipping_phone text;
alter table orders add column if not exists shipping_postal_code text;
alter table orders add column if not exists shipping_address text;
alter table orders add column if not exists shipping_address_detail text;
alter table orders add column if not exists shipping_memo text;
alter table orders add column if not exists desired_ship_date date;

-- updated_at 트리거
drop trigger if exists update_dealer_addresses_updated_at on dealer_addresses;
create trigger update_dealer_addresses_updated_at
  before update on dealer_addresses
  for each row execute function update_updated_at_column();

drop trigger if exists update_cart_items_updated_at on cart_items;
create trigger update_cart_items_updated_at
  before update on cart_items
  for each row execute function update_updated_at_column();
