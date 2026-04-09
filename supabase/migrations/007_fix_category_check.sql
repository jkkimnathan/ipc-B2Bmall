-- ============================================================
-- 카테고리 CHECK 제약조건 수정
-- 003에서 세분화했던 카테고리를 코드 기준(business/pro/master)으로 단순화
-- ============================================================

-- 1. 기존 제약조건 삭제
alter table standard_pcs drop constraint if exists standard_pcs_category_check;

-- 2. 기존 세분화된 카테고리 값을 상위 카테고리로 변환
update standard_pcs set category = 'business' where category like 'business-%';
update standard_pcs set category = 'pro'      where category like 'pro-%';
update standard_pcs set category = 'master'   where category like 'master-%';

-- 3. 혹시 남은 구 카테고리 값도 변환
update standard_pcs set category = 'business' where category in ('office', 'custom');
update standard_pcs set category = 'pro'      where category = 'gaming';
update standard_pcs set category = 'master'   where category = 'workstation';

-- 4. 새 제약조건 추가
alter table standard_pcs add constraint standard_pcs_category_check
  check (category in ('business', 'pro', 'master'));
