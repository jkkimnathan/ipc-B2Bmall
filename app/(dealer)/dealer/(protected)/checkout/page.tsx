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

  // 장바구니 항목 + PC 정보
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select('*, standard_pcs(*)')
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

  const items = cartItems.map((item) => {
    const pc = item.standard_pcs as {
      id: string; name: string; sku: string; sale_price: number; stock_status: string
    }
    return {
      cartItemId: item.id as string,
      pcId: pc.id,
      name: pc.name,
      sku: pc.sku,
      price: pc.sale_price,
      quantity: item.quantity as number,
      stockStatus: pc.stock_status,
    }
  })

  return (
    <CheckoutClient
      items={items}
      addresses={(addresses ?? []) as DealerAddress[]}
      cartItemIds={cartItemIds}
    />
  )
}
