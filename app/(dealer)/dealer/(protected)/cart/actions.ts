'use server'

/**
 * 장바구니 서버 액션
 * 거래처 단위 장바구니 (dealer_id 기준).
 */
import { revalidatePath } from 'next/cache'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'

const REVALIDATE_PATHS = ['/dealer/cart', '/dealer/products', '/dealer']

function revalidateAll() {
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p))
}

/** 장바구니에 담기 (이미 있으면 수량 누적, UPSERT) */
export async function addToCart(standardPcId: string, quantity: number) {
  const session = await requireDealer()
  const supabase = await createClient()

  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('수량은 1 이상이어야 합니다.')

  // 기존 장바구니 항목 확인
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('dealer_id', session.dealer.id)
    .eq('item_type', 'standard_pc')
    .eq('standard_pc_id', standardPcId)
    .maybeSingle()

  if (existing) {
    // 수량 누적
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id)
    if (error) throw new Error('장바구니 업데이트 실패')
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({
        dealer_id: session.dealer.id,
        item_type: 'standard_pc',
        standard_pc_id: standardPcId,
        quantity,
      })
    if (error) throw new Error('장바구니 추가 실패')
  }

  revalidateAll()
}

/** 리퍼 부품을 장바구니에 담기 (실재고 한도 내에서 수량 누적) */
export async function addRefurbPartToCart(refurbPartId: string, quantity: number) {
  const session = await requireDealer()
  const supabase = await createClient()

  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('수량은 1 이상이어야 합니다.')

  // 부품 존재/활성/재고 확인
  const { data: part } = await supabase
    .from('refurb_parts')
    .select('id, name, stock_quantity, is_active')
    .eq('id', refurbPartId)
    .maybeSingle()

  if (!part || !part.is_active) throw new Error('판매 중인 부품이 아닙니다.')
  if (part.stock_quantity <= 0) throw new Error(`${part.name}은(는) 품절되었습니다.`)

  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('dealer_id', session.dealer.id)
    .eq('item_type', 'refurb_part')
    .eq('refurb_part_id', refurbPartId)
    .maybeSingle()

  const desired = (existing?.quantity ?? 0) + quantity
  if (desired > part.stock_quantity) {
    throw new Error(`재고가 부족합니다. 현재 재고 ${part.stock_quantity}개 (장바구니 ${existing?.quantity ?? 0}개)`)
  }

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: desired })
      .eq('id', existing.id)
    if (error) throw new Error('장바구니 업데이트 실패')
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({
        dealer_id: session.dealer.id,
        item_type: 'refurb_part',
        refurb_part_id: refurbPartId,
        quantity,
      })
    if (error) throw new Error('장바구니 추가 실패')
  }

  revalidateAll()
}

/** 장바구니 수량 변경 */
export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  const session = await requireDealer()
  const supabase = await createClient()

  // 0 이하면 삭제
  if (quantity <= 0) {
    return removeCartItem(cartItemId)
  }

  const { data: item } = await supabase
    .from('cart_items')
    .select('dealer_id, item_type, refurb_part_id')
    .eq('id', cartItemId)
    .single()

  if (!item || item.dealer_id !== session.dealer.id) {
    throw new Error('권한이 없습니다.')
  }

  // 리퍼 부품은 실재고 한도를 초과할 수 없음
  if (item.item_type === 'refurb_part' && item.refurb_part_id) {
    const { data: part } = await supabase
      .from('refurb_parts')
      .select('stock_quantity, name')
      .eq('id', item.refurb_part_id)
      .maybeSingle()
    if (part && quantity > part.stock_quantity) {
      throw new Error(`재고가 부족합니다. 현재 재고 ${part.stock_quantity}개`)
    }
  }

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', cartItemId)

  if (error) throw new Error('수량 변경 실패')
  revalidateAll()
}

/** 장바구니 항목 삭제 (단건) */
export async function removeCartItem(cartItemId: string) {
  const session = await requireDealer()
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('cart_items')
    .select('dealer_id')
    .eq('id', cartItemId)
    .single()

  if (!item || item.dealer_id !== session.dealer.id) {
    throw new Error('권한이 없습니다.')
  }

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)

  if (error) throw new Error('삭제 실패')
  revalidateAll()
}

/** 장바구니 항목 다건 삭제 */
export async function removeCartItems(cartItemIds: string[]) {
  const session = await requireDealer()
  const supabase = await createClient()

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('dealer_id', session.dealer.id)
    .in('id', cartItemIds)

  if (error) throw new Error('삭제 실패')
  revalidateAll()
}

/** 장바구니 전체 비우기 */
export async function clearCart() {
  const session = await requireDealer()
  const supabase = await createClient()

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('dealer_id', session.dealer.id)

  if (error) throw new Error('비우기 실패')
  revalidateAll()
}
