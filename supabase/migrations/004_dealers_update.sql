-- ============================================================
-- iPC Mall B2B 시스템 - 거래처/담당자 테이블 보강
-- 작성일: 2026-04-08
-- 설명: dealers에 우편번호/업태/종목/반려사유 추가,
--       dealer_users에 이메일/연락처/대표여부/활성여부 추가
-- ============================================================

-- dealers 테이블 추가 컬럼
alter table dealers add column if not exists postal_code text;       -- 우편번호
alter table dealers add column if not exists business_type text;     -- 업태
alter table dealers add column if not exists business_item text;     -- 종목
alter table dealers add column if not exists rejection_reason text;  -- 반려 사유

-- dealer_users 테이블 추가 컬럼
alter table dealer_users add column if not exists email text;                           -- 이메일
alter table dealer_users add column if not exists phone text;                           -- 연락처
alter table dealer_users add column if not exists is_primary boolean default false;     -- 대표 담당자 여부
alter table dealer_users add column if not exists is_active boolean default true;       -- 활성 여부

-- 거래처별 대표 담당자는 1명만 허용 (partial unique index)
create unique index if not exists idx_dealer_users_primary
  on dealer_users(dealer_id) where is_primary = true;
