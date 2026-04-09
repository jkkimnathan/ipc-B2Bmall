-- ============================================================
-- iPC Mall B2B 시스템 - 표준 PC 테이블 스키마 업데이트
-- 작성일: 2026-04-08
-- 설명: spec_summary/image_url 단일 컬럼을 삭제하고,
--       구조화된 사양(JSONB)과 다중 이미지 지원으로 변경합니다.
-- ============================================================

-- 기존 spec_summary 컬럼 삭제 (한 줄 텍스트는 더 이상 사용하지 않음)
alter table standard_pcs drop column if exists spec_summary;

-- 기존 image_url 컬럼 삭제 (단일 이미지 → 배열로 변경)
alter table standard_pcs drop column if exists image_url;

-- 새 컬럼 추가: 구조화된 사양 정보 (JSONB)
-- cpu, mb, gpu, cooler, ram, ssd, hdd, case, psu, os, as 슬롯 + etc 배열
alter table standard_pcs add column spec_json jsonb not null default '{}'::jsonb;

-- 새 컬럼 추가: 썸네일 이미지 URL 배열 (1~3장)
alter table standard_pcs add column thumbnail_urls text[] not null default '{}';

-- 새 컬럼 추가: 상세 이미지 URL (1장, 긴 세로 이미지)
alter table standard_pcs add column detail_image_url text;

-- spec_json 검색 인덱스 (부품명 검색용)
create index if not exists idx_standard_pcs_spec on standard_pcs using gin (spec_json);
