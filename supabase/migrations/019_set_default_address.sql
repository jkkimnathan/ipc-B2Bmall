-- ============================================================
-- 019: 기본 배송지 설정 트랜잭션화
--
-- 기존에는 "기존 기본 해제" + "새 기본 지정"이 앱에서 두 쿼리로
-- 나뉘어 실행되어, 동시 요청 시 partial unique index
-- (idx_dealer_addresses_default, 005 참조) 충돌로 실패할 수 있었다.
-- 두 갱신을 단일 함수(=단일 트랜잭션)로 묶는다.
--
-- 소유권 검증: current_dealer_id() (018 정의) 기준으로 본인 거래처의
-- 주소만 대상이 되도록 함수 내부에서 확인한다.
-- ============================================================

create or replace function set_default_address(p_address_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dealer_id uuid;
begin
  select dealer_id into v_dealer_id
  from dealer_addresses
  where id = p_address_id;

  if v_dealer_id is null or v_dealer_id <> current_dealer_id() then
    raise exception '권한이 없습니다.';
  end if;

  update dealer_addresses
  set is_default = false
  where dealer_id = v_dealer_id
    and is_default = true
    and id <> p_address_id;

  update dealer_addresses
  set is_default = true
  where id = p_address_id
    and is_default = false;
end;
$$;

revoke execute on function set_default_address(uuid) from public, anon;
grant  execute on function set_default_address(uuid) to authenticated, service_role;
