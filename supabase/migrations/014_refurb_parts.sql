-- ============================================================
-- iPC Mall B2B 시스템 - 리퍼(재정비) 부품 카탈로그
-- 작성일: 2026-07-06
-- 설명: CPU/GPU/RAM 등 리퍼비시 부품을 판매하기 위한 refurb_parts 테이블을
--       추가하고, 기존 장바구니(cart_items)/발주항목(order_items)을
--       표준 PC + 리퍼 부품을 함께 담을 수 있도록 다형(polymorphic)으로 확장한다.
-- ============================================================

-- ------------------------------------------------------------
-- 1. refurb_parts (리퍼 부품)
-- part_type      : cpu/gpu/ram/ssd/hdd/mb/psu/case/cooler/monitor/etc
-- condition_grade: S(최상) / A(상) / B(중) — 리퍼 등급
-- stock_quantity : 실재고 수량 (리퍼는 개별 수량 관리)
-- warranty_months: 자체 보증 개월 수
-- market_price   : 신품 시세(참고용, 할인율 표시에 사용)
-- ------------------------------------------------------------
create table if not exists refurb_parts (
  id                uuid        primary key default uuid_generate_v4(),
  sku               text        unique not null,
  name              text        not null,
  part_type         text        not null
                                check (part_type in (
                                  'cpu','gpu','ram','ssd','hdd','mb',
                                  'psu','case','cooler','monitor','etc'
                                )),
  condition_grade   text        not null default 'A'
                                check (condition_grade in ('S','A','B')),
  manufacturer      text,                                              -- 제조사
  description       text,                                              -- 상세 설명
  spec_summary      text,                                              -- 한 줄 사양 요약
  thumbnail_urls    text[]      not null default '{}',                 -- 썸네일 (1~3장)
  detail_image_url  text,                                              -- 상세 이미지
  market_price      integer     check (market_price is null or market_price >= 0), -- 신품 시세
  sale_price        integer     not null check (sale_price >= 0),      -- 판매가
  stock_quantity    integer     not null default 0 check (stock_quantity >= 0), -- 실재고
  warranty_months   integer     not null default 3 check (warranty_months >= 0),
  is_active         boolean     default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists idx_refurb_parts_active  on refurb_parts(is_active, part_type);
create index if not exists idx_refurb_parts_created on refurb_parts(created_at desc);

drop trigger if exists trg_refurb_parts_updated_at on refurb_parts;
create trigger trg_refurb_parts_updated_at
  before update on refurb_parts
  for each row execute function update_updated_at_column();

-- ------------------------------------------------------------
-- 2. cart_items 다형 확장
-- 표준 PC와 리퍼 부품을 하나의 장바구니에 함께 담는다.
-- item_type으로 구분하고, 해당 타입의 FK만 채워진다.
-- ------------------------------------------------------------
alter table cart_items add column if not exists item_type text not null default 'standard_pc'
  check (item_type in ('standard_pc', 'refurb_part'));
alter table cart_items add column if not exists refurb_part_id uuid references refurb_parts(id) on delete cascade;

-- standard_pc_id를 nullable로 변경 (리퍼 부품 항목은 NULL)
alter table cart_items alter column standard_pc_id drop not null;

-- 정확히 한 종류의 참조만 채워지도록 보장
alter table cart_items drop constraint if exists cart_items_one_ref;
alter table cart_items add constraint cart_items_one_ref check (
  (item_type = 'standard_pc' and standard_pc_id is not null and refurb_part_id is null) or
  (item_type = 'refurb_part' and refurb_part_id is not null and standard_pc_id is null)
);

-- 기존 (dealer_id, standard_pc_id) UNIQUE 제약을 부분 유니크 인덱스로 대체
alter table cart_items drop constraint if exists cart_items_dealer_id_standard_pc_id_key;
create unique index if not exists idx_cart_unique_standard
  on cart_items(dealer_id, standard_pc_id) where item_type = 'standard_pc';
create unique index if not exists idx_cart_unique_refurb
  on cart_items(dealer_id, refurb_part_id) where item_type = 'refurb_part';

-- ------------------------------------------------------------
-- 3. order_items 다형 확장
-- 발주 항목도 리퍼 부품을 담을 수 있게 한다.
-- 이름/단가는 기존 스냅샷 컬럼(pc_name_snapshot, unit_price_snapshot)을 그대로 재사용.
-- ------------------------------------------------------------
alter table order_items add column if not exists item_type text not null default 'standard_pc'
  check (item_type in ('standard_pc', 'refurb_part'));
alter table order_items add column if not exists refurb_part_id uuid references refurb_parts(id) on delete set null;

-- ------------------------------------------------------------
-- 4. 리퍼 재고 원자적 차감 함수
-- 동시 발주 시 재고가 음수로 내려가지 않도록 행 단위 원자 갱신으로 예약한다.
-- 재고가 충분하면 차감 후 TRUE, 부족하면 아무 것도 하지 않고 FALSE 반환.
-- SECURITY DEFINER: RLS와 무관하게 재고를 관리한다 (서버 액션에서만 호출).
-- ------------------------------------------------------------
create or replace function reserve_refurb_stock(p_part_id uuid, p_qty integer)
returns boolean as $$
declare
  v_updated integer;
begin
  update refurb_parts
     set stock_quantity = stock_quantity - p_qty
   where id = p_part_id
     and stock_quantity >= p_qty;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$ language plpgsql security definer;

-- 재고 복원 (발주 취소/반려 시)
create or replace function restore_refurb_stock(p_part_id uuid, p_qty integer)
returns void as $$
begin
  update refurb_parts
     set stock_quantity = stock_quantity + p_qty
   where id = p_part_id;
end;
$$ language plpgsql security definer;
