'use server'

/**
 * 표준 PC 관리 서버 액션
 * 등록, 수정, 삭제, 활성 토글 처리.
 * 모든 액션은 requireAdmin()으로 관리자 인증을 확인한다.
 *
 * ⚠️ 에러 처리 주의:
 * Next.js 프로덕션 빌드는 서버 액션에서 throw된 에러 메시지를 스크러빙하여
 * 클라이언트에 "An error occurred in the Server Components render..." 제네릭 메시지로
 * 노출한다. 따라서 사용자에게 보여줄 메시지는 throw 대신 { error: string } 형태로
 * return하여 클라이언트가 toast에 그대로 표시할 수 있도록 한다.
 */
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { toSafeInt } from '@/lib/utils/format'
import type { StandardPcSpec } from '@/types/database'

export type ActionResult = { error?: string }

/** 활성/비활성 토글 */
export async function toggleProductActive(id: string, currentValue: boolean): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('standard_pcs')
    .update({ is_active: !currentValue })
    .eq('id', id)

  if (error) return { error: '활성 상태 변경에 실패했습니다: ' + error.message }
  revalidatePath('/admin/products')
  return {}
}

/** 제품 삭제 (Storage 이미지도 함께 삭제) */
export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // 1. 기존 제품 정보 조회 (이미지 URL 확보)
  const { data: product, error: fetchError } = await supabase
    .from('standard_pcs')
    .select('thumbnail_urls, detail_image_url')
    .eq('id', id)
    .single()

  if (fetchError) return { error: '제품 조회에 실패했습니다: ' + fetchError.message }

  // 2. DB에서 제품 삭제 (Storage 삭제보다 먼저 수행하여 실패 시 이미지 참조가 고아가 되지 않게 함)
  const { error } = await supabase.from('standard_pcs').delete().eq('id', id)

  if (error) {
    // FK 에러 (발주 내역에서 참조 중 — 마이그레이션 012 이후에는 SET NULL이라 발생하지 않음)
    if (error.code === '23503') {
      return { error: '이 PC는 발주 내역에서 사용 중이라 삭제할 수 없습니다. 대신 \'비활성\' 처리해주세요.' }
    }
    return { error: '삭제에 실패했습니다: ' + error.message }
  }

  // 3. DB 삭제 성공 후 Storage 이미지 삭제
  await deleteStorageFiles(supabase, product.thumbnail_urls ?? [], product.detail_image_url)

  revalidatePath('/admin/products')
  return {}
}

/** 제품 등록 */
export async function createProduct(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  let specJson: StandardPcSpec
  try {
    specJson = JSON.parse(formData.get('spec_json') as string) as StandardPcSpec
  } catch {
    return { error: '사양 정보 형식이 올바르지 않습니다.' }
  }
  const thumbnailUrls = JSON.parse(formData.get('thumbnail_urls') as string) as string[]
  const detailImageUrl = formData.get('detail_image_url') as string | null

  const salePrice = toSafeInt(formData.get('sale_price'), { min: 0 })
  const leadTimeDays = toSafeInt(formData.get('lead_time_days'), { min: 0 })
  if (salePrice === null) return { error: '판매가를 올바르게 입력해주세요.' }
  if (leadTimeDays === null) return { error: '납기(영업일)를 올바르게 입력해주세요.' }

  const { error } = await supabase.from('standard_pcs').insert({
    sku: formData.get('sku') as string,
    name: formData.get('name') as string,
    category: formData.get('category') as string,
    description: (formData.get('description') as string) || null,
    spec_json: specJson,
    thumbnail_urls: thumbnailUrls,
    detail_image_url: detailImageUrl || null,
    sale_price: salePrice,
    stock_status: formData.get('stock_status') as string,
    lead_time_days: leadTimeDays,
    is_active: formData.get('is_active') === 'true',
  })

  if (error) {
    if (error.code === '23505') return { error: '이미 사용 중인 SKU입니다. 다른 SKU를 입력해주세요.' }
    return { error: '등록에 실패했습니다: ' + error.message }
  }

  revalidatePath('/admin/products')
  return {}
}

/** 제품 수정 */
export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // 삭제 대상 기존 이미지 처리 (Storage 삭제는 DB 수정 성공 후 수행)
  const removedThumbnails = JSON.parse(formData.get('removed_thumbnails') as string || '[]') as string[]
  const removedDetail = formData.get('removed_detail') as string | null

  let specJson: StandardPcSpec
  try {
    specJson = JSON.parse(formData.get('spec_json') as string) as StandardPcSpec
  } catch {
    return { error: '사양 정보 형식이 올바르지 않습니다.' }
  }
  const thumbnailUrls = JSON.parse(formData.get('thumbnail_urls') as string) as string[]
  const detailImageUrl = formData.get('detail_image_url') as string | null

  const salePrice = toSafeInt(formData.get('sale_price'), { min: 0 })
  const leadTimeDays = toSafeInt(formData.get('lead_time_days'), { min: 0 })
  if (salePrice === null) return { error: '판매가를 올바르게 입력해주세요.' }
  if (leadTimeDays === null) return { error: '납기(영업일)를 올바르게 입력해주세요.' }

  const { error } = await supabase
    .from('standard_pcs')
    .update({
      sku: formData.get('sku') as string,
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      description: (formData.get('description') as string) || null,
      spec_json: specJson,
      thumbnail_urls: thumbnailUrls,
      detail_image_url: detailImageUrl || null,
      sale_price: salePrice,
      stock_status: formData.get('stock_status') as string,
      lead_time_days: leadTimeDays,
      is_active: formData.get('is_active') === 'true',
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: '이미 사용 중인 SKU입니다.' }
    return { error: '수정에 실패했습니다: ' + error.message }
  }

  // DB 수정 성공 후 제거 대상 Storage 이미지 삭제 (실패 시 이미지 참조 고아 방지)
  await deleteStorageFiles(supabase, removedThumbnails, removedDetail)

  revalidatePath('/admin/products')
  return {}
}

// ============================================================
// 내부 헬퍼
// ============================================================

/** Storage에서 파일 삭제 (URL에서 경로 추출) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteStorageFiles(supabase: any, thumbnailUrls: string[], detailUrl: string | null) {
  try {
    // 썸네일 삭제
    if (thumbnailUrls.length > 0) {
      const thumbPaths = thumbnailUrls
        .map((url) => extractStoragePath(url, 'product-thumbnails'))
        .filter(Boolean) as string[]
      if (thumbPaths.length > 0) {
        await supabase.storage.from('product-thumbnails').remove(thumbPaths)
      }
    }

    // 상세 이미지 삭제
    if (detailUrl) {
      const detailPath = extractStoragePath(detailUrl, 'product-details')
      if (detailPath) {
        await supabase.storage.from('product-details').remove([detailPath])
      }
    }
  } catch {
    // Storage 삭제 실패는 무시 (데이터 삭제가 우선)
    console.error('Storage 파일 삭제 중 오류 발생')
  }
}

/** Supabase Storage URL에서 파일 경로만 추출 */
function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(url.slice(idx + marker.length))
  } catch {
    return null
  }
}
