-- ============================================================
-- iPC Mall B2B 시스템 - order_items 참조 무결성 CHECK
-- 작성일: 2026-07-06
-- 설명: cart_items(cart_items_one_ref)와 동일하게 order_items에도
--       item_type에 맞는 참조만 채워지도록 보장한다.
--       주의: standard_pc 항목은 견적 기반 발주(acceptQuote)나 원본 삭제
--       (ON DELETE SET NULL)로 standard_pc_id가 NULL일 수 있으므로
--       "refurb_part_id가 비어 있음"만 강제한다.
-- ============================================================

alter table order_items drop constraint if exists order_items_ref_check;
alter table order_items add constraint order_items_ref_check check (
  (item_type = 'standard_pc' and refurb_part_id is null) or
  (item_type = 'refurb_part' and refurb_part_id is not null and standard_pc_id is null)
);
