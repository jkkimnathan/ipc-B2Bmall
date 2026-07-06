/**
 * 발주서 작성(체크아웃) 페이지
 */
import { redirect } from 'next/navigation'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import CheckoutClient from '@/components/dealer/cart/CheckoutClient'
import type { DealerAddress } from '@/types/database'

interface PageProps {
  searchParams: Promise<{ items?: string }>
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const session = await requireDealer()
  const sp = await searchParams
  const supabase = await createClient()

  const cartItemIds = sp.items?.split(',').filter(Boolean)
  if (!cartItemIds?.length) redirect('/dealer/cart')

  // 장바구니 항목 + PC/리퍼 부품 정보
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select('*, standard_pcs(*), refurb_parts(*)')
    .eq('dealer_id', session.dealer.id)
    .in('id', cartItemIds)

  if (!cartItems?.length) redirect('/dealer/cart')

  // 배송지 목록
  const { data: addresses } = await supabase
    .from('dealer_addresses')
    .select('*')
    .eq('dealer_id', session.dealer.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  type CheckoutRow = {
    cartItemId: string
    itemType: 'standard_pc' | 'refurb_part'
    name: string
    sku: string
    price: number
    quantity: number
    available: boolean
    note?: string
  }
  const items = cartItems.flatMap((item): CheckoutRow[] => {
    const qty = item.quantity as number
    if (item.item_type === 'refurb_part') {
      const part = item.refurb_parts as {
        id: string; name: string; sku: string; sale_price: number; stock_quantity: number
      } | null
      if (!part) return []
      return [{
        cartItemId: item.id as string,
        itemType: 'refurb_part' as const,
        name: part.name,
        sku: part.sku,
        price: part.sale_price,
        quantity: qty,
        available: part.stock_quantity >= qty,
        note: part.stock_quantity < qty ? `재고 부족 (${part.stock_quantity}개)` : undefined,
      }]
    }
    const pc = item.standard_pcs as {
      id: string; name: string; sku: string; sale_price: number; stock_status: string
    } | null
    if (!pc) return []
    return [{
      cartItemId: item.id as string,
      itemType: 'standard_pc' as const,
      name: pc.name,
      sku: pc.sku,
      price: pc.sale_price,
      quantity: qty,
      available: pc.stock_status !== 'out_of_stock',
      note: pc.stock_status === 'out_of_stock' ? '품절' : undefined,
    }]
  })

  return (
    <CheckoutClient
      items={items}
      addresses={(addresses ?? []) as DealerAddress[]}
      cartItemIds={cartItemIds}
    />
  )
}
