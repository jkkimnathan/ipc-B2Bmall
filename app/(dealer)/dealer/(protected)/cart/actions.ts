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

  if (quantity <= 0) throw new Error('수량은 1 이상이어야 합니다.')

  // 기존 장바구니 항목 확인
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('dealer_id', session.dealer.id)
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
        standard_pc_id: standardPcId,
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
    .select('dealer_id')
    .eq('id', cartItemId)
    .single()

  if (!item || item.dealer_id !== session.dealer.id) {
    throw new Error('권한이 없습니다.')
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
