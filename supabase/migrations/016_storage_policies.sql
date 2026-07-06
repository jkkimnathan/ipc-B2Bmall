-- ============================================================
-- iPC Mall B2B 시스템 - Storage 버킷 접근 정책
-- 작성일: 2026-07-06
-- ------------------------------------------------------------
-- 대상 버킷:
--   · product-thumbnails / product-details : 상품 이미지 (관리자만 업로드)
--   · rfq-attachments                      : 견적요청 첨부 (인증 거래처 업로드)
--
-- 목적: 공개 anon 키로 상품 이미지를 임의 업로드/삭제하거나, 타 버킷을
--       조작하지 못하도록 storage.objects 에 최소 권한 정책을 적용한다.
--       (service_role 키는 정책과 무관하게 동작한다.)
--
-- 주의: 버킷은 사전에 생성되어 있어야 하며, 기존에 더 넓은 권한의 정책이
--       존재한다면 함께 정리(검토)해야 실질적 제한이 적용된다.
-- ============================================================

-- ── 상품 이미지: 공개 읽기 ──
drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select
  using (bucket_id in ('product-thumbnails', 'product-details'));

-- ── 상품 이미지: 관리자만 업로드/수정/삭제 ──
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-thumbnails', 'product-details') and is_admin());

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id in ('product-thumbnails', 'product-details') and is_admin())
  with check (bucket_id in ('product-thumbnails', 'product-details') and is_admin());

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-thumbnails', 'product-details') and is_admin());

-- ── RFQ 첨부: 인증 사용자 업로드 + 읽기 (관리자 전체 권한 포함) ──
drop policy if exists rfq_attachments_auth_read on storage.objects;
create policy rfq_attachments_auth_read on storage.objects
  for select to authenticated
  using (bucket_id = 'rfq-attachments');

drop policy if exists rfq_attachments_auth_insert on storage.objects;
create policy rfq_attachments_auth_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rfq-attachments');

drop policy if exists rfq_attachments_admin_manage on storage.objects;
create policy rfq_attachments_admin_manage on storage.objects
  for delete to authenticated
  using (bucket_id = 'rfq-attachments' and is_admin());
