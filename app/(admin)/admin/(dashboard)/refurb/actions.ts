'use server'

/**
 * 리퍼 부품 관리 서버 액션
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

export type ActionResult = { error?: string }

/** 활성/비활성 토글 */
export async function toggleRefurbActive(id: string, currentValue: boolean): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('refurb_parts')
    .update({ is_active: !currentValue })
    .eq('id', id)

  if (error) return { error: '활성 상태 변경에 실패했습니다: ' + error.message }
  revalidatePath('/admin/refurb')
  return {}
}

/** 리퍼 부품 삭제 (Storage 이미지도 함께 삭제) */
export async function deleteRefurbPart(id: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // 1. 기존 부품 정보 조회 (이미지 URL 확보)
  const { data: part, error: fetchError } = await supabase
    .from('refurb_parts')
    .select('thumbnail_urls, detail_image_url')
    .eq('id', id)
    .single()

  if (fetchError) return { error: '부품 조회에 실패했습니다: ' + fetchError.message }

  // 2. DB에서 부품 삭제 (Storage 삭제보다 먼저 수행하여 실패 시 이미지 참조가 고아가 되지 않게 함)
  const { error } = await supabase.from('refurb_parts').delete().eq('id', id)

  if (error) {
    // FK 에러 (발주/장바구니 내역에서 참조 중)
    if (error.code === '23503') {
      return { error: '이 부품은 발주 내역에서 사용 중이라 삭제할 수 없습니다. 대신 \'비활성\' 처리해주세요.' }
    }
    return { error: '삭제에 실패했습니다: ' + error.message }
  }

  // 3. DB 삭제 성공 후 Storage 이미지 삭제
  await deleteStorageFiles(supabase, part.thumbnail_urls ?? [], part.detail_image_url)

  revalidatePath('/admin/refurb')
  return {}
}

/** 리퍼 부품 등록 */
export async function createRefurbPart(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const thumbnailUrls = JSON.parse(formData.get('thumbnail_urls') as string) as string[]
  const detailImageUrl = formData.get('detail_image_url') as string | null
  const marketPriceRaw = formData.get('market_price') as string | null

  // 숫자 필드 안전 파싱 (NaN/소수/음수면 null → 검증 실패 처리)
  let marketPrice: number | null = null
  if (marketPriceRaw && marketPriceRaw.trim() !== '') {
    marketPrice = toSafeInt(marketPriceRaw, { min: 0 })
    if (marketPrice === null) return { error: '신품 시세를 올바르게 입력해주세요.' }
  }
  const salePrice = toSafeInt(formData.get('sale_price'), { min: 0 })
  const stockQuantity = toSafeInt(formData.get('stock_quantity'), { min: 0 })
  const warrantyMonths = toSafeInt(formData.get('warranty_months'), { min: 0 })
  if (salePrice === null) return { error: '판매가를 올바르게 입력해주세요.' }
  if (stockQuantity === null) return { error: '재고 수량을 올바르게 입력해주세요.' }
  if (warrantyMonths === null) return { error: '보증 기간(개월)을 올바르게 입력해주세요.' }

  const { error } = await supabase.from('refurb_parts').insert({
    sku: formData.get('sku') as string,
    name: formData.get('name') as string,
    part_type: formData.get('part_type') as string,
    condition_grade: formData.get('condition_grade') as string,
    manufacturer: (formData.get('manufacturer') as string) || null,
    description: (formData.get('description') as string) || null,
    spec_summary: (formData.get('spec_summary') as string) || null,
    thumbnail_urls: thumbnailUrls,
    detail_image_url: detailImageUrl || null,
    market_price: marketPrice,
    sale_price: salePrice,
    stock_quantity: stockQuantity,
    warranty_months: warrantyMonths,
    is_active: formData.get('is_active') === 'true',
  })

  if (error) {
    if (error.code === '23505') return { error: '이미 사용 중인 SKU입니다. 다른 SKU를 입력해주세요.' }
    return { error: '등록에 실패했습니다: ' + error.message }
  }

  revalidatePath('/admin/refurb')
  return {}
}

/** 리퍼 부품 수정 */
export async function updateRefurbPart(id: string, formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // 삭제 대상 기존 이미지 처리 (Storage 삭제는 DB 수정 성공 후 수행)
  const removedThumbnails = JSON.parse(formData.get('removed_thumbnails') as string || '[]') as string[]
  const removedDetail = formData.get('removed_detail') as string | null

  const thumbnailUrls = JSON.parse(formData.get('thumbnail_urls') as string) as string[]
  const detailImageUrl = formData.get('detail_image_url') as string | null
  const marketPriceRaw = formData.get('market_price') as string | null

  // 숫자 필드 안전 파싱 (NaN/소수/음수면 null → 검증 실패 처리)
  let marketPrice: number | null = null
  if (marketPriceRaw && marketPriceRaw.trim() !== '') {
    marketPrice = toSafeInt(marketPriceRaw, { min: 0 })
    if (marketPrice === null) return { error: '신품 시세를 올바르게 입력해주세요.' }
  }
  const salePrice = toSafeInt(formData.get('sale_price'), { min: 0 })
  const stockQuantity = toSafeInt(formData.get('stock_quantity'), { min: 0 })
  const warrantyMonths = toSafeInt(formData.get('warranty_months'), { min: 0 })
  if (salePrice === null) return { error: '판매가를 올바르게 입력해주세요.' }
  if (stockQuantity === null) return { error: '재고 수량을 올바르게 입력해주세요.' }
  if (warrantyMonths === null) return { error: '보증 기간(개월)을 올바르게 입력해주세요.' }

  const { error } = await supabase
    .from('refurb_parts')
    .update({
      sku: formData.get('sku') as string,
      name: formData.get('name') as string,
      part_type: formData.get('part_type') as string,
      condition_grade: formData.get('condition_grade') as string,
      manufacturer: (formData.get('manufacturer') as string) || null,
      description: (formData.get('description') as string) || null,
      spec_summary: (formData.get('spec_summary') as string) || null,
      thumbnail_urls: thumbnailUrls,
      detail_image_url: detailImageUrl || null,
      market_price: marketPrice,
      sale_price: salePrice,
      stock_quantity: stockQuantity,
      warranty_months: warrantyMonths,
      is_active: formData.get('is_active') === 'true',
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: '이미 사용 중인 SKU입니다.' }
    return { error: '수정에 실패했습니다: ' + error.message }
  }

  // DB 수정 성공 후 제거 대상 Storage 이미지 삭제 (실패 시 이미지 참조 고아 방지)
  await deleteStorageFiles(supabase, removedThumbnails, removedDetail)

  revalidatePath('/admin/refurb')
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
