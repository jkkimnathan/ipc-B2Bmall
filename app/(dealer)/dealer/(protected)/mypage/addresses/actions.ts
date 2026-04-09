'use server'

/**
 * 거래처 배송지 주소록 서버 액션
 * 모든 액션에서 requireDealer()로 본인 dealer_id만 접근 보장.
 */
import { revalidatePath } from 'next/cache'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'

const REVALIDATE_PATH = '/dealer/mypage/addresses'

/** 배송지 생성 */
export async function createAddress(formData: FormData) {
  const session = await requireDealer()
  const supabase = await createClient()

  const label = formData.get('label') as string
  const recipientName = formData.get('recipient_name') as string
  const phone = formData.get('phone') as string
  const postalCode = formData.get('postal_code') as string | null
  const address = formData.get('address') as string
  const addressDetail = formData.get('address_detail') as string | null
  const memo = formData.get('memo') as string | null
  const isDefault = formData.get('is_default') === 'true'

  if (!label?.trim()) throw new Error('라벨을 입력해주세요.')
  if (!recipientName?.trim()) throw new Error('받는 사람을 입력해주세요.')
  if (!phone?.trim()) throw new Error('연락처를 입력해주세요.')
  if (!address?.trim()) throw new Error('주소를 입력해주세요.')

  // 기본 배송지 설정 시 기존 기본 해제
  if (isDefault) {
    await supabase
      .from('dealer_addresses')
      .update({ is_default: false })
      .eq('dealer_id', session.dealer.id)
      .eq('is_default', true)
  }

  const { error } = await supabase
    .from('dealer_addresses')
    .insert({
      dealer_id: session.dealer.id,
      label: label.trim(),
      recipient_name: recipientName.trim(),
      phone: phone.trim(),
      postal_code: postalCode?.trim() || null,
      address: address.trim(),
      address_detail: addressDetail?.trim() || null,
      memo: memo?.trim() || null,
      is_default: isDefault,
    })

  if (error) throw new Error('등록 실패: ' + error.message)
  revalidatePath(REVALIDATE_PATH)
}

/** 배송지 수정 */
export async function updateAddress(id: string, formData: FormData) {
  const session = await requireDealer()
  const supabase = await createClient()

  // 본인 소유 확인
  const { data: existing } = await supabase
    .from('dealer_addresses')
    .select('dealer_id')
    .eq('id', id)
    .single()

  if (!existing || existing.dealer_id !== session.dealer.id) {
    throw new Error('권한이 없습니다.')
  }

  const label = formData.get('label') as string
  const recipientName = formData.get('recipient_name') as string
  const phone = formData.get('phone') as string
  const postalCode = formData.get('postal_code') as string | null
  const address = formData.get('address') as string
  const addressDetail = formData.get('address_detail') as string | null
  const memo = formData.get('memo') as string | null
  const isDefault = formData.get('is_default') === 'true'

  // 기본 배송지 설정 시 기존 기본 해제
  if (isDefault) {
    await supabase
      .from('dealer_addresses')
      .update({ is_default: false })
      .eq('dealer_id', session.dealer.id)
      .eq('is_default', true)
  }

  const { error } = await supabase
    .from('dealer_addresses')
    .update({
      label: label.trim(),
      recipient_name: recipientName.trim(),
      phone: phone.trim(),
      postal_code: postalCode?.trim() || null,
      address: address.trim(),
      address_detail: addressDetail?.trim() || null,
      memo: memo?.trim() || null,
      is_default: isDefault,
    })
    .eq('id', id)

  if (error) throw new Error('수정 실패: ' + error.message)
  revalidatePath(REVALIDATE_PATH)
}

/** 배송지 삭제 */
export async function deleteAddress(id: string) {
  const session = await requireDealer()
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('dealer_addresses')
    .select('dealer_id')
    .eq('id', id)
    .single()

  if (!existing || existing.dealer_id !== session.dealer.id) {
    throw new Error('권한이 없습니다.')
  }

  const { error } = await supabase
    .from('dealer_addresses')
    .delete()
    .eq('id', id)

  if (error) throw new Error('삭제 실패: ' + error.message)
  revalidatePath(REVALIDATE_PATH)
}

/** 기본 배송지 설정 */
export async function setDefaultAddress(id: string) {
  const session = await requireDealer()
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('dealer_addresses')
    .select('dealer_id')
    .eq('id', id)
    .single()

  if (!existing || existing.dealer_id !== session.dealer.id) {
    throw new Error('권한이 없습니다.')
  }

  // 기존 기본 해제
  await supabase
    .from('dealer_addresses')
    .update({ is_default: false })
    .eq('dealer_id', session.dealer.id)
    .eq('is_default', true)

  // 새 기본 설정
  const { error } = await supabase
    .from('dealer_addresses')
    .update({ is_default: true })
    .eq('id', id)

  if (error) throw new Error('설정 실패: ' + error.message)
  revalidatePath(REVALIDATE_PATH)
}
