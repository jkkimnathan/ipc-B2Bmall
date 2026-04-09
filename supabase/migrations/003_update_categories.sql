-- ============================================================
-- iPC Mall B2B 시스템 - 카테고리 구조 변경
-- 작성일: 2026-04-08
-- 설명: 기존 office/gaming/workstation/custom 카테고리를
--       iPC Business / iPC Pro / iPC Master 3개 라인 + 하위 등급으로 변경
-- ============================================================

-- 기존 CHECK 제약조건 삭제
alter table standard_pcs drop constraint if exists standard_pcs_category_check;

-- 새로운 CHECK 제약조건 추가
alter table standard_pcs add constraint standard_pcs_category_check
  check (category in (
    'business-entry', 'business-standard', 'business-advance',
    'pro-creator', 'pro-engineer', 'pro-developer',
    'master-researcher', 'master-director', 'master-analyst'
  ));
