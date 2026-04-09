/**
 * 거래처 장바구니 페이지
 */
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import CartTable from '@/components/dealer/cart/CartTable'

export default async function CartPage() {
  const session = await requireDealer()
  const supabase = await createClient()

  // 장바구니 + PC 정보 조인
  const { data: items } = await supabase
    .from('cart_items')
    .select('*, standard_pcs(*)')
    .eq('dealer_id', session.dealer.id)
    .order('created_at', { ascending: true })

  const cartItems = (items ?? []).map((item) => ({
    id: item.id as string,
    quantity: item.quantity as number,
    pc: item.standard_pcs as {
      id: string; sku: string; name: string; sale_price: number;
      stock_status: string; thumbnail_urls: string[];
    },
  }))

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-zinc-900">장바구니</h1>
        <div className="text-center py-16 space-y-4">
          <ShoppingCart className="size-16 mx-auto text-zinc-200" />
          <p className="text-sm text-zinc-400">장바구니가 비어 있습니다.</p>
          <Button render={<Link href="/dealer/products" />}>
            표준 PC 보러가기
          </Button>
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
