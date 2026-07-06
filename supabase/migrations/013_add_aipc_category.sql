-- ============================================================
-- iPC Mall B2B 시스템 - AiPC(iPC AI) 라인 추가
-- 작성일: 2026-07-06
-- 설명: 온디바이스 AI/NPU 탑재 PC를 위한 'aipc' 카테고리를 추가한다.
--       기존 business / pro / master 3개 라인에 4번째 라인을 더한다.
-- ============================================================

-- 1. 기존 CHECK 제약조건 삭제
alter table standard_pcs drop constraint if exists standard_pcs_category_check;

-- 2. 'aipc'를 포함한 새 CHECK 제약조건 추가
alter table standard_pcs add constraint standard_pcs_category_check
  check (category in ('business', 'pro', 'master', 'aipc'));
