-- ============================================================
-- iPC Mall B2B 시스템 - Row Level Security (RLS) 전면 적용
-- 작성일: 2026-07-06
-- ------------------------------------------------------------
-- 배경 / 목적:
--   지금까지 모든 테이블에 RLS가 비활성 상태였다. 이 경우 공개(anon)/인증
--   (authenticated) 역할이 PostgREST를 통해 모든 행에 직접 접근할 수 있어,
--   로그인한 거래처가 공개 API 키만으로 다른 거래처의 발주/견적/개인정보를
--   읽거나 조작할 수 있는 심각한 취약점이 존재했다.
--
--   본 마이그레이션은 모든 테이블에 RLS를 켜고, 다음 원칙의 정책을 적용한다.
--     · 관리자(is_admin())            : 전 테이블 전체 권한
--     · 거래처(current_dealer_id())    : 자기 거래처 데이터로만 범위 제한
--     · 활성 카탈로그(standard_pcs/refurb_parts) : 인증 사용자 읽기 허용
--     · service_role(관리자/시스템 서버작업) : RLS 우회(기존과 동일)
--
-- ⚠️ 매우 중요 (적용 전 필수 확인):
--   관리자 콘솔은 "세션(anon) 클라이언트"로 DB를 읽고 쓴다. 따라서 RLS가
--   켜지면 is_admin() 이 true 인 계정만 관리자 기능을 사용할 수 있다.
--   is_admin() 은 아래 admin_users 테이블의 이메일 목록을 기준으로 판단하므로,
--   **RLS 적용과 동시에 ADMIN_EMAILS 환경변수의 모든 관리자 이메일을
--   admin_users 에 반드시 INSERT** 해야 한다. 누락 시 관리자 접근이 차단된다.
-- ============================================================

-- ------------------------------------------------------------
-- 0. 관리자 이메일 레지스트리 + 판별 함수
-- ------------------------------------------------------------
create table if not exists admin_users (
  email       text        primary key,
  created_at  timestamptz default now()
);

-- 초기 관리자 시드 (배포 환경의 ADMIN_EMAILS와 반드시 일치시킬 것)
insert into admin_users (email) values
  ('intechncompany@intechonline.kr')
on conflict (email) do nothing;

-- 현재 요청자가 관리자인지 (JWT 이메일 ↔ admin_users)
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 현재 요청자의 거래처 ID (활성 dealer_user 기준). 관리자/비거래처는 NULL.
create or replace function current_dealer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select dealer_id from dealer_users
  where auth_user_id = auth.uid() and is_active = true
  limit 1
$$;

-- ------------------------------------------------------------
-- 1. RLS 활성화
-- ------------------------------------------------------------
alter table dealers               enable row level security;
alter table dealer_users          enable row level security;
alter table standard_pcs          enable row level security;
alter table refurb_parts          enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table quote_requests        enable row level security;
alter table quotes                enable row level security;
alter table dealer_addresses      enable row level security;
alter table cart_items            enable row level security;
alter table order_events          enable row level security;
alter table rfq_events            enable row level security;
alter table email_logs            enable row level security;
alter table notification_settings enable row level security;
alter table admin_users           enable row level security;

-- ------------------------------------------------------------
-- 2. 관리자 전체 권한 정책 (모든 테이블 공통)
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'dealers','dealer_users','standard_pcs','refurb_parts','orders','order_items',
    'quote_requests','quotes','dealer_addresses','cart_items','order_events',
    'rfq_events','email_logs','notification_settings','admin_users'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_admin_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (is_admin()) with check (is_admin())',
      t || '_admin_all', t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3. 카탈로그: 인증 사용자 활성 상품 읽기
-- ------------------------------------------------------------
drop policy if exists standard_pcs_read_active on standard_pcs;
create policy standard_pcs_read_active on standard_pcs
  for select to authenticated using (is_active = true);

drop policy if exists refurb_parts_read_active on refurb_parts;
create policy refurb_parts_read_active on refurb_parts
  for select to authenticated using (is_active = true);

-- ------------------------------------------------------------
-- 4. 거래처(자기 거래처 범위) 정책
-- ------------------------------------------------------------

-- dealers: 자기 거래처 조회/수정 (회사정보·사업자등록증)
drop policy if exists dealers_select_own on dealers;
create policy dealers_select_own on dealers
  for select to authenticated using (id = current_dealer_id());
drop policy if exists dealers_update_own on dealers;
create policy dealers_update_own on dealers
  for update to authenticated using (id = current_dealer_id()) with check (id = current_dealer_id());

-- dealer_users: 같은 거래처 소속 사용자 조회/추가/수정
drop policy if exists dealer_users_select_own on dealer_users;
create policy dealer_users_select_own on dealer_users
  for select to authenticated using (dealer_id = current_dealer_id());
drop policy if exists dealer_users_insert_own on dealer_users;
create policy dealer_users_insert_own on dealer_users
  for insert to authenticated with check (dealer_id = current_dealer_id());
drop policy if exists dealer_users_update_own on dealer_users;
create policy dealer_users_update_own on dealer_users
  for update to authenticated using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());

-- cart_items: 자기 거래처 장바구니 전체 권한
drop policy if exists cart_items_own on cart_items;
create policy cart_items_own on cart_items
  for all to authenticated using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());

-- dealer_addresses: 자기 거래처 배송지 전체 권한
drop policy if exists dealer_addresses_own on dealer_addresses;
create policy dealer_addresses_own on dealer_addresses
  for all to authenticated using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());

-- orders: 자기 거래처 발주 조회/생성/수정 (삭제는 관리자 전용)
drop policy if exists orders_select_own on orders;
create policy orders_select_own on orders
  for select to authenticated using (dealer_id = current_dealer_id());
drop policy if exists orders_insert_own on orders;
create policy orders_insert_own on orders
  for insert to authenticated with check (dealer_id = current_dealer_id());
drop policy if exists orders_update_own on orders;
create policy orders_update_own on orders
  for update to authenticated using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());

-- order_items: 소속 발주(order)를 통해 범위 제한
drop policy if exists order_items_own on order_items;
create policy order_items_own on order_items
  for all to authenticated
  using (order_id in (select id from orders where dealer_id = current_dealer_id()))
  with check (order_id in (select id from orders where dealer_id = current_dealer_id()));

-- quote_requests: 자기 거래처 RFQ 조회/생성/수정
drop policy if exists quote_requests_select_own on quote_requests;
create policy quote_requests_select_own on quote_requests
  for select to authenticated using (dealer_id = current_dealer_id());
drop policy if exists quote_requests_insert_own on quote_requests;
create policy quote_requests_insert_own on quote_requests
  for insert to authenticated with check (dealer_id = current_dealer_id());
drop policy if exists quote_requests_update_own on quote_requests;
create policy quote_requests_update_own on quote_requests
  for update to authenticated using (dealer_id = current_dealer_id()) with check (dealer_id = current_dealer_id());

-- quotes: 자기 RFQ에 대한 견적서 조회/수정(수락·거절·만료). 생성은 관리자 전용.
drop policy if exists quotes_select_own on quotes;
create policy quotes_select_own on quotes
  for select to authenticated
  using (rfq_id in (select id from quote_requests where dealer_id = current_dealer_id()));
drop policy if exists quotes_update_own on quotes;
create policy quotes_update_own on quotes
  for update to authenticated
  using (rfq_id in (select id from quote_requests where dealer_id = current_dealer_id()))
  with check (rfq_id in (select id from quote_requests where dealer_id = current_dealer_id()));

-- order_events: 소속 발주의 "거래처 노출" 이벤트 조회 + 이벤트 기록(생성)
drop policy if exists order_events_select_own on order_events;
create policy order_events_select_own on order_events
  for select to authenticated
  using (is_visible_to_dealer = true and order_id in (select id from orders where dealer_id = current_dealer_id()));
drop policy if exists order_events_insert_own on order_events;
create policy order_events_insert_own on order_events
  for insert to authenticated
  with check (order_id in (select id from orders where dealer_id = current_dealer_id()));

-- rfq_events: 소속 RFQ의 "거래처 노출" 이벤트 조회 + 이벤트 기록(생성)
drop policy if exists rfq_events_select_own on rfq_events;
create policy rfq_events_select_own on rfq_events
  for select to authenticated
  using (is_visible_to_dealer = true and rfq_id in (select id from quote_requests where dealer_id = current_dealer_id()));
drop policy if exists rfq_events_insert_own on rfq_events;
create policy rfq_events_insert_own on rfq_events
  for insert to authenticated
  with check (rfq_id in (select id from quote_requests where dealer_id = current_dealer_id()));

-- email_logs / notification_settings / admin_users:
-- 별도 거래처 정책 없음 → 관리자(is_admin) 및 service_role 만 접근 가능.

-- ============================================================
-- 참고: service_role 키(createAdminClient)는 RLS를 우회하므로
-- 회원가입 프로비저닝, 재고 예약/복원 RPC, 발주 롤백 삭제 등
-- 기존 서버 로직은 그대로 동작한다.
-- ============================================================
