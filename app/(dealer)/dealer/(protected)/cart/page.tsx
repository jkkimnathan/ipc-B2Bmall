/**
 * 거래처 장바구니 페이지
 * 표준 PC와 리퍼 부품을 하나의 장바구니에서 함께 관리한다.
 */
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import CartTable, { type CartItemRow } from '@/components/dealer/cart/CartTable'

export default async function CartPage() {
  const session = await requireDealer()
  const supabase = await createClient()

  // 장바구니 + 표준 PC + 리퍼 부품 정보 조인
  const { data: items } = await supabase
    .from('cart_items')
    .select('*, standard_pcs(*), refurb_parts(*)')
    .eq('dealer_id', session.dealer.id)
    .order('created_at', { ascending: true })

  // 원본 상품이 비활성/삭제되어 조인이 비는 경우(RLS로 활성 상품만 조회 가능)에도
  // 조용히 사라지지 않도록 "판매 종료" 행으로 표시한다 (삭제만 가능).
  const unavailableRow = (item: { id: unknown; quantity: unknown; item_type: string }): CartItemRow => ({
    id: item.id as string,
    quantity: item.quantity as number,
    itemType: item.item_type as 'standard_pc' | 'refurb_part',
    product: {
      id: '',
      sku: '—',
      name: '판매가 종료된 상품입니다',
      salePrice: 0,
      available: false,
      stockLabel: '판매 종료',
      href: item.item_type === 'refurb_part' ? '/dealer/refurb' : '/dealer/products',
    },
  })

  const cartItems: CartItemRow[] = (items ?? []).flatMap((item): CartItemRow[] => {
    if (item.item_type === 'refurb_part') {
      const p = item.refurb_parts as {
        id: string; sku: string; name: string; sale_price: number;
        stock_quantity: number; thumbnail_urls: string[]
      } | null
      if (!p) return [unavailableRow(item)]
      return [{
        id: item.id as string,
        quantity: item.quantity as number,
        itemType: 'refurb_part' as const,
        product: {
          id: p.id,
          sku: p.sku,
          name: p.name,
          salePrice: p.sale_price,
          thumbnail: p.thumbnail_urls?.[0],
          available: p.stock_quantity > 0,
          stockLabel: p.stock_quantity > 0 ? `재고 ${p.stock_quantity}개` : '품절',
          maxQty: p.stock_quantity,
          href: `/dealer/refurb/${p.id}`,
        },
      }]
    }

    const p = item.standard_pcs as {
      id: string; sku: string; name: string; sale_price: number;
      stock_status: string; thumbnail_urls: string[]
    } | null
    if (!p) return [unavailableRow(item)]
    const outOfStock = p.stock_status === 'out_of_stock'
    return [{
      id: item.id as string,
      quantity: item.quantity as number,
      itemType: 'standard_pc' as const,
      product: {
        id: p.id,
        sku: p.sku,
        name: p.name,
        salePrice: p.sale_price,
        thumbnail: p.thumbnail_urls?.[0],
        available: !outOfStock,
        stockLabel: outOfStock ? '재고없음' : undefined,
        href: `/dealer/products/${p.id}`,
      },
    }]
  })

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-zinc-900">장바구니</h1>
        <div className="text-center py-16 space-y-4">
          <ShoppingCart className="size-16 mx-auto text-zinc-200" />
          <p className="text-sm text-zinc-400">장바구니가 비어 있습니다.</p>
          <div className="flex justify-center gap-2">
            <Button render={<Link href="/dealer/products" />}>표준 PC 보러가기</Button>
            <Button variant="outline" render={<Link href="/dealer/refurb" />}>리퍼 부품 보러가기</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-zinc-900">장바구니</h1>
      <CartTable items={cartItems} />
    </div>
  )
}
