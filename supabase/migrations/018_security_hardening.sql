-- ============================================================
-- iPC Mall B2B 시스템 - 보안 하드닝 (코드 리뷰 후속 조치)
-- 작성일: 2026-07-06
-- ------------------------------------------------------------
-- 배경:
--   015/016에서 RLS를 전면 적용했으나, 거래처 정책이 "행 단위"만 제한하고
--   "컬럼 단위" 제한이 없어 공개 anon 키 + 자신의 JWT로 PostgREST를 직접
--   호출하면 정지 계정 자가 복구·견적가 조작·감사로그 위조가 가능했다.
--   또한 재고 조작 RPC가 전체 공개, 타 거래처 RFQ 첨부 열람이 가능했다.
--
-- 본 마이그레이션의 원칙:
--   · 거래처의 orders/order_items/quotes/quote_requests/events "쓰기"는
--     모두 서버 액션(service_role)을 통해서만 수행 → 해당 테이블의 거래처
--     INSERT/UPDATE 정책을 제거(조회 정책은 유지).
--   · dealers 는 거래처가 연락처/주소만 수정하도록 컬럼 단위 GRANT 로 제한.
--   · dealer_users 쓰기도 서버 액션(service_role) 전용 → 거래처 쓰기 정책 제거,
--     로그인 시각 갱신은 touch_last_login() RPC 로 대체.
--   · 재고 RPC 는 service_role 에게만 EXECUTE 부여.
--   · 관리자 판별은 자가 주장 가능한 JWT email 대신 auth.users 의 확인된
--     이메일(email_confirmed_at) + admin_users 레지스트리로 고정.
--   · 금액 컬럼 integer → bigint (대량 B2B 발주 오버플로 방지).
--   · Storage: rfq-attachments 거래처 경로 스코프, dealer-documents 관리자 전용.
-- ============================================================

-- ------------------------------------------------------------
-- 0. 재고 RPC 를 service_role 전용으로 잠금 (기존 공개 EXECUTE 회수)
-- ------------------------------------------------------------
revoke execute on function reserve_refurb_stock(uuid, integer) from public, anon, authenticated;
revoke execute on function restore_refurb_stock(uuid, integer) from public, anon, authenticated;
grant  execute on function reserve_refurb_stock(uuid, integer) to service_role;
grant  execute on function restore_refurb_stock(uuid, integer) to service_role;

-- ------------------------------------------------------------
-- 1. 관리자 판별 강화: 확인된 이메일 + admin_users
--    (자가 주장 가능한 JWT email 문자열이 아니라, auth.users 의 실제 계정 +
--     email_confirmed_at 을 확인. security definer 로 auth 스키마 접근.)
-- ------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admin_users a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

-- ------------------------------------------------------------
-- 2. 거래처 판별 강화: dealers.status='active' 인 경우에만 dealer_id 반환
--    (정지된 거래처는 NULL → 자기 거래처 행을 더 이상 조작할 수 없음)
-- ------------------------------------------------------------
create or replace function current_dealer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select du.dealer_id
  from dealer_users du
  join dealers d on d.id = du.dealer_id
  where du.auth_user_id = auth.uid()
    and du.is_active = true
    and d.status = 'active'
  limit 1
$$;

-- ------------------------------------------------------------
-- 3. dealers: 거래처(비관리자)는 보호 컬럼을 수정할 수 없도록 트리거로 차단.
--    컬럼 단위 GRANT 는 authenticated 역할 전체(관리자 세션 포함)에 적용되어
--    관리자 콘솔의 거래처 편집까지 막으므로, 대신 BEFORE UPDATE 트리거에서
--    "관리자(is_admin) 또는 service_role" 이 아니면 보호 컬럼 변경을 거부한다.
--    거래처가 자유롭게 바꿀 수 있는 컬럼: postal_code, address, phone.
-- ------------------------------------------------------------
create or replace function dealers_guard_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 관리자 또는 service_role 은 전체 수정 허용
  if is_admin() or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  -- 그 외(거래처)는 아래 보호 컬럼을 변경할 수 없음
  if new.status            is distinct from old.status
     or new.business_no    is distinct from old.business_no
     or new.erp_code       is distinct from old.erp_code
     or new.approved_at    is distinct from old.approved_at
     or new.company_name   is distinct from old.company_name
     or new.ceo_name       is distinct from old.ceo_name
     or new.memo           is distinct from old.memo
     or new.rejection_reason is distinct from old.rejection_reason
     or new.business_cert_url is distinct from old.business_cert_url
     or new.business_type  is distinct from old.business_type
     or new.business_item  is distinct from old.business_item
  then
    raise exception '거래처는 회사 식별/상태 정보를 변경할 수 없습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dealers_guard on dealers;
create trigger trg_dealers_guard
  before update on dealers
  for each row execute function dealers_guard_protected_columns();

-- ------------------------------------------------------------
-- 4. dealer_users: 거래처 직접 쓰기 정책 제거 (쓰기는 service_role 서버 액션 전용)
--    조회 정책(dealer_users_select_own)은 유지.
-- ------------------------------------------------------------
drop policy if exists dealer_users_insert_own on dealer_users;
drop policy if exists dealer_users_update_own on dealer_users;

-- 로그인 시각 갱신: 자신의 dealer_users 행만 갱신하는 정의자 권한 RPC
create or replace function touch_last_login()
returns void
language sql
security definer
set search_path = public
as $$
  update dealer_users
     set last_login_at = now()
   where auth_user_id = auth.uid();
$$;
revoke execute on function touch_last_login() from public, anon;
grant  execute on function touch_last_login() to authenticated, service_role;

-- ------------------------------------------------------------
-- 5. orders / order_items / quotes / quote_requests:
--    거래처 쓰기 정책 제거 (쓰기는 service_role 서버 액션 전용). 조회 정책 유지.
-- ------------------------------------------------------------
drop policy if exists orders_insert_own          on orders;
drop policy if exists orders_update_own          on orders;
drop policy if exists order_items_own            on order_items;
drop policy if exists quotes_update_own          on quotes;
drop policy if exists quote_requests_insert_own  on quote_requests;
drop policy if exists quote_requests_update_own  on quote_requests;

-- order_items 는 조회 정책이 없었으므로(기존 for all 제거) 소속 발주 기준 조회 정책 추가
drop policy if exists order_items_select_own on order_items;
create policy order_items_select_own on order_items
  for select to authenticated
  using (order_id in (select id from orders where dealer_id = current_dealer_id()));

-- ------------------------------------------------------------
-- 6. order_events / rfq_events: 거래처 INSERT(위조) 정책 제거.
--    이벤트 기록은 service_role 서버 액션 전용. 조회 정책은 유지.
-- ------------------------------------------------------------
drop policy if exists order_events_insert_own on order_events;
drop policy if exists rfq_events_insert_own   on rfq_events;

-- ------------------------------------------------------------
-- 7. 금액 컬럼 integer → bigint (오버플로 방지)
-- ------------------------------------------------------------
alter table standard_pcs   alter column sale_price          type bigint;
alter table orders         alter column total_amount        type bigint;
alter table order_items    alter column unit_price_snapshot type bigint;
alter table order_items    alter column subtotal            type bigint;
alter table quote_requests alter column budget_per_unit     type bigint;
alter table quotes         alter column unit_price          type bigint;
alter table quotes         alter column total_amount        type bigint;
alter table refurb_parts   alter column market_price        type bigint;
alter table refurb_parts   alter column sale_price          type bigint;

-- ------------------------------------------------------------
-- 8. 집계 금액 컬럼 비음수 CHECK
-- ------------------------------------------------------------
alter table orders      drop constraint if exists orders_total_amount_nonneg;
alter table orders      add  constraint orders_total_amount_nonneg check (total_amount >= 0);
alter table order_items drop constraint if exists order_items_subtotal_nonneg;
alter table order_items add  constraint order_items_subtotal_nonneg check (subtotal >= 0);
alter table quotes      drop constraint if exists quotes_total_amount_nonneg;
alter table quotes      add  constraint quotes_total_amount_nonneg check (total_amount >= 0);

-- ------------------------------------------------------------
-- 9. 전역 문서 채번 카운터 (발주번호 거래처 간 충돌 방지)
--    거래처별 RLS 로 카운트가 왜곡되던 방식을 원자적 시퀀스로 대체.
--    key 예: 'order:20260706' → 반환 seq 로 PO-20260706-000N 구성.
-- ------------------------------------------------------------
create table if not exists doc_counters (
  key text primary key,
  seq integer not null default 0
);
alter table doc_counters enable row level security;
-- 거래처 정책 없음 → service_role 및 RPC(정의자)만 접근

create or replace function next_doc_seq(p_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
begin
  insert into doc_counters (key, seq)
  values (p_key, 1)
  on conflict (key) do update set seq = doc_counters.seq + 1
  returning seq into v_seq;
  return v_seq;
end;
$$;
revoke execute on function next_doc_seq(text) from public, anon;
grant  execute on function next_doc_seq(text) to authenticated, service_role;

-- ------------------------------------------------------------
-- 10. Storage: rfq-attachments 거래처 경로 스코프
--     경로 규칙: "<dealer_id>/<파일명>" (첫 폴더가 거래처 ID)
--     비공개 버킷 전환은 대시보드에서 수행하고, 조회는 signed URL 사용.
-- ------------------------------------------------------------
drop policy if exists rfq_attachments_auth_read   on storage.objects;
drop policy if exists rfq_attachments_auth_insert  on storage.objects;
drop policy if exists rfq_attachments_admin_manage on storage.objects;

create policy rfq_attachments_own_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rfq-attachments'
    and (
      is_admin()
      or (storage.foldername(name))[1] = current_dealer_id()::text
    )
  );

create policy rfq_attachments_own_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rfq-attachments'
    and (storage.foldername(name))[1] = current_dealer_id()::text
  );

create policy rfq_attachments_own_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'rfq-attachments'
    and (
      is_admin()
      or (storage.foldername(name))[1] = current_dealer_id()::text
    )
  );

-- ------------------------------------------------------------
-- 11. Storage: dealer-documents (사업자등록증, 민감 PII) 관리자 전용
--     업로드/삭제는 service_role 서버 액션에서 수행하므로 정책과 무관.
--     관리자 세션 클라이언트의 signed URL 생성을 위해 select 정책만 부여.
-- ------------------------------------------------------------
drop policy if exists dealer_documents_admin_read on storage.objects;
create policy dealer_documents_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'dealer-documents' and is_admin());
