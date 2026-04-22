-- ============================================================
-- FK 제약 보정: 원본 삭제 시 참조 컬럼을 NULL로 설정하도록 변경
-- ------------------------------------------------------------
-- 배경:
-- order_items/quotes/order_items의 FK가 기본 NO ACTION(RESTRICT)으로 걸려
-- 관리자가 발주에 사용된 표준 PC나 견적서를 삭제할 수 없었다.
-- 코드 주석에는 "삭제 시에도 스냅샷 유지"라고 명시돼 있으므로
-- 의도에 맞춰 ON DELETE SET NULL로 바꾼다.
-- 스냅샷(pc_name_snapshot, unit_price_snapshot 등)은 이미 각 행에 저장돼 있어
-- 원본 참조가 NULL이 되어도 이력은 그대로 유지된다.
-- ============================================================

-- 1) order_items.standard_pc_id → standard_pcs 삭제 시 NULL
alter table order_items drop constraint if exists order_items_standard_pc_id_fkey;
alter table order_items
  add constraint order_items_standard_pc_id_fkey
  foreign key (standard_pc_id) references standard_pcs(id) on delete set null;

-- 2) order_items.source_quote_id → quotes 삭제 시 NULL
alter table order_items drop constraint if exists order_items_source_quote_id_fkey;
alter table order_items
  add constraint order_items_source_quote_id_fkey
  foreign key (source_quote_id) references quotes(id) on delete set null;

-- 3) quotes.converted_order_id → orders 삭제 시 NULL (견적서 자체는 이력 유지)
alter table quotes drop constraint if exists quotes_converted_order_id_fkey;
alter table quotes
  add constraint quotes_converted_order_id_fkey
  foreign key (converted_order_id) references orders(id) on delete set null;
