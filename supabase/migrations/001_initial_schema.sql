-- ============================================================
-- iPC Mall B2B 시스템 - 초기 데이터베이스 스키마
-- 작성일: 2026-04-08
-- 설명: 거래처(딜러) 관리, 표준 PC 카탈로그, 발주, 견적 요청/회신
--       총 7개 테이블과 관련 인덱스, 트리거를 생성합니다.
-- ============================================================

-- UUID 생성 확장 활성화
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. dealers (거래처)
-- 인텍앤컴퍼니와 거래하는 유통사/거래처 정보를 저장합니다.
-- status: pending(승인대기) → active(활성) / suspended(정지)
-- ============================================================
create table dealers (
  id              uuid        primary key default uuid_generate_v4(),
  company_name    text        not null,                                    -- 거래처(회사)명
  business_no     text        unique not null,                             -- 사업자등록번호 (중복 불가)
  ceo_name        text,                                                    -- 대표자명
  contact_name    text,                                                    -- 담당자명
  phone           text,                                                    -- 연락처
  email           text,                                                    -- 이메일
  address         text,                                                    -- 주소
  erp_code        text,                                                    -- ERP 거래처 코드 (내부 연동용)
  status          text        not null default 'pending'
                              check (status in ('pending', 'active', 'suspended')),
  business_cert_url text,                                                  -- 사업자등록증 파일 URL
  memo            text,                                                    -- 관리자 메모
  created_at      timestamptz default now(),                               -- 등록일시
  approved_at     timestamptz                                              -- 승인일시
);

-- ============================================================
-- 2. dealer_users (거래처 로그인 계정)
-- 하나의 거래처에 여러 명의 사용자가 소속될 수 있습니다.
-- auth_user_id는 Supabase Auth의 사용자 UUID와 연결됩니다.
-- ============================================================
create table dealer_users (
  id              uuid        primary key default uuid_generate_v4(),
  dealer_id       uuid        not null references dealers(id) on delete cascade,  -- 소속 거래처
  auth_user_id    uuid,                                                           -- Supabase Auth 사용자 ID
  login_id        text        unique not null,                                    -- 로그인 ID
  name            text        not null,                                           -- 사용자 이름
  role            text,                                                           -- 역할 (예: 관리자, 일반)
  last_login_at   timestamptz,                                                    -- 마지막 로그인 시각
  created_at      timestamptz default now()                                       -- 계정 생성일
);

-- ============================================================
-- 3. standard_pcs (표준 PC)
-- iPC 브랜드 표준 PC 카탈로그입니다. 거래처가 발주할 수 있는 제품 목록.
-- category: office(사무용), gaming(게이밍), workstation(워크스테이션), custom(맞춤형)
-- stock_status: in_stock(재고있음), low_stock(재고부족), out_of_stock(품절), made_to_order(주문생산)
-- ============================================================
create table standard_pcs (
  id              uuid        primary key default uuid_generate_v4(),
  sku             text        unique not null,                             -- 제품 코드 (SKU)
  name            text        not null,                                    -- 제품명
  category        text        check (category in ('office', 'gaming', 'workstation', 'custom')),
  description     text,                                                    -- 제품 설명
  spec_summary    text,                                                    -- 주요 사양 요약
  image_url       text,                                                    -- 대표 이미지 URL
  sale_price      integer     not null check (sale_price >= 0),            -- 공급가 (원)
  stock_status    text        not null default 'in_stock'
                              check (stock_status in ('in_stock', 'low_stock', 'out_of_stock', 'made_to_order')),
  lead_time_days  integer     default 5,                                   -- 출하 소요일
  is_active       boolean     default true,                                -- 판매 활성 여부
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 4. orders (발주서)
-- 거래처가 표준 PC를 발주할 때 생성됩니다.
-- status 흐름: submitted(제출) → approved(승인) → in_production(생산중)
--              → shipped(출하) → completed(완료) / rejected(반려) / canceled(취소)
-- ============================================================
create table orders (
  id                uuid        primary key default uuid_generate_v4(),
  order_no          text        unique not null,                           -- 발주 번호 (예: ORD-20260408-001)
  dealer_id         uuid        not null references dealers(id),           -- 발주 거래처
  dealer_user_id    uuid        references dealer_users(id),               -- 발주 담당자
  status            text        not null default 'submitted'
                                check (status in ('submitted', 'approved', 'rejected',
                                  'in_production', 'shipped', 'completed', 'canceled')),
  total_amount      integer     not null default 0,                        -- 총 금액 (원)
  dealer_memo       text,                                                  -- 거래처 메모
  admin_memo        text,                                                  -- 관리자 메모
  expected_ship_date date,                                                 -- 예상 출하일
  submitted_at      timestamptz default now(),                             -- 제출일시
  approved_at       timestamptz,                                           -- 승인일시
  shipped_at        timestamptz                                            -- 출하일시
);

-- ============================================================
-- 5. order_items (발주 항목)
-- 하나의 발주에 포함된 개별 PC 항목입니다.
-- 발주 시점의 제품명과 단가를 스냅샷으로 저장하여, 이후 가격 변동에 영향받지 않습니다.
-- ============================================================
create table order_items (
  id                  uuid    primary key default uuid_generate_v4(),
  order_id            uuid    not null references orders(id) on delete cascade,  -- 소속 발주
  standard_pc_id      uuid    references standard_pcs(id),                       -- 원본 제품 (삭제 시에도 스냅샷 유지)
  pc_name_snapshot    text    not null,                                          -- 발주 시점 제품명
  unit_price_snapshot integer not null,                                          -- 발주 시점 단가
  quantity            integer not null check (quantity > 0),                     -- 수량
  subtotal            integer not null                                           -- 소계 (단가 × 수량)
);

-- ============================================================
-- 6. quote_requests (견적 요청 - RFQ)
-- 거래처가 맞춤 사양이나 대량 구매 시 견적을 요청할 때 생성됩니다.
-- status 흐름: submitted(제출) → quoted(견적완료) → accepted(수락) → converted_to_order(발주전환)
--              / rejected(거절) / expired(만료) / canceled(취소)
-- ============================================================
create table quote_requests (
  id                uuid        primary key default uuid_generate_v4(),
  rfq_no            text        unique not null,                           -- 견적요청 번호 (예: RFQ-20260408-001)
  dealer_id         uuid        not null references dealers(id),           -- 요청 거래처
  dealer_user_id    uuid        references dealer_users(id),               -- 요청 담당자
  title             text        not null,                                  -- 요청 제목
  purpose           text,                                                  -- 사용 목적
  quantity          integer     not null check (quantity > 0),             -- 희망 수량
  budget_per_unit   integer,                                               -- 대당 예산 (원)
  desired_ship_date date,                                                  -- 희망 납품일
  requirements      text        not null,                                  -- 상세 요구사항
  attachment_url    text,                                                  -- 첨부 파일 URL
  status            text        not null default 'submitted'
                                check (status in ('submitted', 'quoted', 'accepted', 'rejected',
                                  'expired', 'converted_to_order', 'canceled')),
  submitted_at      timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ============================================================
-- 7. quotes (견적서 회신)
-- 관리자가 견적 요청(RFQ)에 대해 견적서를 작성하여 회신합니다.
-- status 흐름: draft(작성중) → sent(발송) → accepted(수락) / rejected(거절) / expired(만료)
-- ============================================================
create table quotes (
  id                  uuid        primary key default uuid_generate_v4(),
  quote_no            text        unique not null,                         -- 견적서 번호 (예: QT-20260408-001)
  rfq_id              uuid        not null references quote_requests(id) on delete cascade,  -- 원본 견적요청
  proposed_spec       text        not null,                                -- 제안 사양
  unit_price          integer     not null check (unit_price >= 0),        -- 대당 단가 (원)
  quantity            integer     not null check (quantity > 0),           -- 수량
  total_amount        integer     not null,                                -- 총 금액 (원)
  vat_included        boolean     default false,                           -- 부가세 포함 여부
  lead_time_days      integer     not null,                                -- 납품 소요일
  valid_until         date        not null,                                -- 견적 유효기한
  admin_memo          text,                                                -- 관리자 메모
  status              text        not null default 'draft'
                                  check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  sent_at             timestamptz,                                         -- 발송일시
  responded_at        timestamptz,                                         -- 거래처 응답일시
  converted_order_id  uuid        references orders(id),                   -- 발주 전환된 경우 해당 발주 ID
  created_at          timestamptz default now()
);

-- ============================================================
-- 인덱스
-- 자주 사용하는 조회 조건에 대한 인덱스를 생성하여 성능을 최적화합니다.
-- ============================================================
create index idx_dealers_status        on dealers(status);
create index idx_orders_dealer_status  on orders(dealer_id, status);
create index idx_orders_submitted      on orders(submitted_at desc);
create index idx_rfq_dealer_status     on quote_requests(dealer_id, status);
create index idx_rfq_submitted         on quote_requests(submitted_at desc);
create index idx_standard_pcs_active   on standard_pcs(is_active, category);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- UPDATE 실행 시 updated_at 컬럼을 현재 시각으로 자동 갱신합니다.
-- 적용 대상: standard_pcs, quote_requests
-- ============================================================

-- 트리거 함수 생성 (공용)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- standard_pcs 테이블에 트리거 적용
create trigger trg_standard_pcs_updated_at
  before update on standard_pcs
  for each row
  execute function update_updated_at_column();

-- quote_requests 테이블에 트리거 적용
create trigger trg_quote_requests_updated_at
  before update on quote_requests
  for each row
  execute function update_updated_at_column();
