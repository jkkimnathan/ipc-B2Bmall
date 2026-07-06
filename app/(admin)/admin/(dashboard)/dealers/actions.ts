'use server'

/**
 * 거래처 관리 서버 액션
 * 거래처 등록/승인/반려/정지/수정/삭제 및 담당자 관리 처리.
 * 계정 발급 시 Supabase Auth admin API (service role)를 사용한다.
 */
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTempPassword, isValidEmail, isValidBusinessNo } from '@/lib/utils/format'
import { sendEmail } from '@/lib/email/send'
import { getSiteUrl } from '@/lib/email/helpers'
import DealerApprovedEmail from '@/components/emails/DealerApprovedEmail'

const REVALIDATE_PATH = '/admin/dealers'

// ============================================================
// 거래처 CRUD
// ============================================================

/** 거래처 직접 등록 (즉시 활성 + 첫 담당자 계정 발급) */
export async function createDealerWithUser(formData: FormData): Promise<{
  dealerId: string
  loginId: string
  tempPassword: string
}> {
  await requireAdmin()
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // 입력 검증 (INSERT 전에 수행)
  const contactEmailInput = (formData.get('contact_email') as string) || ''
  const businessNoInput = (formData.get('business_no') as string) || ''
  if (!isValidEmail(contactEmailInput)) throw new Error('담당자 이메일 주소가 올바르지 않습니다.')
  if (!isValidBusinessNo(businessNoInput)) throw new Error('사업자번호가 올바르지 않습니다.')

  // 1. 거래처 INSERT
  const { data: dealer, error: dealerError } = await supabase
    .from('dealers')
    .insert({
      company_name: formData.get('company_name') as string,
      business_no: (formData.get('business_no') as string).replace(/\D/g, ''),
      ceo_name: (formData.get('ceo_name') as string) || null,
      business_type: (formData.get('business_type') as string) || null,
      business_item: (formData.get('business_item') as string) || null,
      postal_code: (formData.get('postal_code') as string) || null,
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('contact_email') as string) || null,
      contact_name: formData.get('contact_name') as string,
      business_cert_url: (formData.get('business_cert_url') as string) || null,
      memo: (formData.get('memo') as string) || null,
      status: 'active',
      approved_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (dealerError) {
    if (dealerError.code === '23505') throw new Error('이미 등록된 사업자번호입니다.')
    throw new Error('거래처 등록 실패: ' + dealerError.message)
  }

  // 2. Supabase Auth 사용자 생성
  const contactEmail = formData.get('contact_email') as string
  const tempPassword = generateTempPassword()

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: contactEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { dealer_id: dealer.id, role: 'dealer' },
  })

  if (authError) {
    // 롤백: 생성된 거래처 삭제
    await supabase.from('dealers').delete().eq('id', dealer.id)
    throw new Error('담당자 계정 생성 실패: ' + authError.message)
  }

  // 3. dealer_users INSERT
  const { error: userError } = await supabase.from('dealer_users').insert({
    dealer_id: dealer.id,
    auth_user_id: authData.user.id,
    login_id: contactEmail,
    name: formData.get('contact_name') as string,
    email: contactEmail,
    phone: (formData.get('contact_phone') as string) || null,
    role: (formData.get('contact_role') as string) || null,
    is_primary: true,
  })

  if (userError) {
    // 롤백: 생성된 Auth 사용자와 거래처를 모두 제거 (고아 계정/거래처 방지)
    await adminSupabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('dealers').delete().eq('id', dealer.id)
    throw new Error('담당자 정보 저장 실패: ' + userError.message)
  }

  revalidatePath(REVALIDATE_PATH)

  return {
    dealerId: dealer.id,
    loginId: contactEmail,
    tempPassword,
  }
}

/** 가입신청 승인 (pending → active + 첫 담당자 계정 발급) */
export async function approveDealer(dealerId: string): Promise<{
  loginId: string
  tempPassword: string
}> {
  await requireAdmin()
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // 거래처 정보 조회
  const { data: dealer, error: fetchError } = await supabase
    .from('dealers')
    .select('*, dealer_users(*)')
    .eq('id', dealerId)
    .single()

  if (fetchError || !dealer) throw new Error('거래처를 찾을 수 없습니다.')
  if (dealer.status !== 'pending') throw new Error('승인대기 상태가 아닙니다.')

  // 이미 담당자 계정이 있는지 확인
  const existingUsers = dealer.dealer_users as { id: string; auth_user_id: string | null; email: string | null; is_primary?: boolean }[]
  const primaryUser = existingUsers?.find((u) => u.is_primary) ?? existingUsers?.[0]

  if (!primaryUser) throw new Error('담당자 정보가 없습니다. 거래처 정보를 확인해주세요.')

  const loginEmail = primaryUser.email || dealer.email
  if (!loginEmail) throw new Error('담당자 이메일이 없습니다.')

  // Auth 사용자 생성
  const tempPassword = generateTempPassword()

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: loginEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { dealer_id: dealerId, role: 'dealer' },
  })

  if (authError) throw new Error('계정 생성 실패: ' + authError.message)

  // dealer_users에 auth_user_id 업데이트
  const { error: linkError } = await supabase
    .from('dealer_users')
    .update({ auth_user_id: authData.user.id, login_id: loginEmail, is_primary: true, is_active: true })
    .eq('id', primaryUser.id)

  if (linkError) {
    // 계정 연결 실패 시 방금 만든 Auth 사용자 제거 (연결되지 않은 계정에 자격증명 발송 방지)
    await adminSupabase.auth.admin.deleteUser(authData.user.id)
    throw new Error('담당자 계정 연결 실패: ' + linkError.message)
  }

  // 거래처 상태 변경
  const { error: updateError } = await supabase
    .from('dealers')
    .update({ status: 'active', approved_at: new Date().toISOString(), rejection_reason: null })
    .eq('id', dealerId)

  if (updateError) {
    // 상태 변경 실패 시 방금 만든 Auth 사용자 제거
    await adminSupabase.auth.admin.deleteUser(authData.user.id)
    throw new Error('승인 처리 실패: ' + updateError.message)
  }

  revalidatePath(REVALIDATE_PATH)

  // 승인 이메일 발송
  try {
    await sendEmail({
      templateKey: 'dealer_dealer_approved',
      to: loginEmail,
      recipientType: 'dealer',
      recipientName: primaryUser.email ?? '',
      subject: 'iPC Mall 가입이 승인되었습니다',
      react: DealerApprovedEmail({
        dealerName: dealer.company_name,
        contactName: dealer.contact_name ?? '',
        loginId: loginEmail,
        tempPassword,
        loginUrl: `${getSiteUrl()}/dealer/login`,
      }),
      relatedDealerId: dealerId,
    })
  } catch { /* 이메일 실패가 비즈니스 로직 차단 안 함 */ }

  return { loginId: loginEmail, tempPassword }
}

/** 가입신청 반려 (suspended + 사유 저장) */
export async function rejectDealer(dealerId: string, reason: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('dealers')
    .update({ status: 'suspended', rejection_reason: reason })
    .eq('id', dealerId)

  if (error) throw new Error('반려 처리 실패: ' + error.message)
  revalidatePath(REVALIDATE_PATH)
}

/** 거래처 정지 / 활성화 */
export async function setDealerStatus(dealerId: string, status: 'active' | 'suspended') {
  await requireAdmin()
  const supabase = await createClient()

  const updates: Record<string, unknown> = { status }
  if (status === 'active') {
    updates.approved_at = new Date().toISOString()
    updates.rejection_reason = null
  }

  const { error } = await supabase.from('dealers').update(updates).eq('id', dealerId)
  if (error) throw new Error('상태 변경 실패: ' + error.message)

  revalidatePath(REVALIDATE_PATH)
}

/** 거래처 정보 수정 */
export async function updateDealer(dealerId: string, formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('dealers')
    .update({
      company_name: formData.get('company_name') as string,
      business_no: (formData.get('business_no') as string).replace(/\D/g, ''),
      ceo_name: (formData.get('ceo_name') as string) || null,
      business_type: (formData.get('business_type') as string) || null,
      business_item: (formData.get('business_item') as string) || null,
      postal_code: (formData.get('postal_code') as string) || null,
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('contact_email') as string) || null,
      contact_name: (formData.get('contact_name') as string) || null,
      business_cert_url: (formData.get('business_cert_url') as string) || null,
      memo: (formData.get('memo') as string) || null,
    })
    .eq('id', dealerId)

  if (error) {
    if (error.code === '23505') throw new Error('이미 등록된 사업자번호입니다.')
    throw new Error('수정 실패: ' + error.message)
  }

  revalidatePath(REVALIDATE_PATH)
  revalidatePath(`/admin/dealers/${dealerId}`)
}

/** 거래처 삭제 (거래 이력 있으면 차단) */
export async function deleteDealer(dealerId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('dealers').delete().eq('id', dealerId)

  if (error) {
    if (error.code === '23503') {
      throw new Error('이 거래처는 거래 이력이 있어 삭제할 수 없습니다. 대신 \'정지\' 처리해주세요.')
    }
    throw new Error('삭제 실패: ' + error.message)
  }

  revalidatePath(REVALIDATE_PATH)
}

/** 메모만 업데이트 */
export async function updateDealerMemo(dealerId: string, memo: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('dealers')
    .update({ memo })
    .eq('id', dealerId)

  if (error) throw new Error('메모 저장 실패: ' + error.message)
  revalidatePath(`/admin/dealers/${dealerId}`)
}

// ============================================================
// 담당자 관리
// ============================================================

/** 담당자 추가 (Auth 계정 + dealer_users) */
export async function addDealerUser(dealerId: string, formData: FormData): Promise<{
  loginId: string
  tempPassword: string
}> {
  await requireAdmin()
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const email = formData.get('email') as string
  const tempPassword = generateTempPassword()

  // Auth 사용자 생성
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { dealer_id: dealerId, role: 'dealer' },
  })

  if (authError) throw new Error('계정 생성 실패: ' + authError.message)

  // dealer_users INSERT
  const { error } = await supabase.from('dealer_users').insert({
    dealer_id: dealerId,
    auth_user_id: authData.user.id,
    login_id: email,
    name: formData.get('name') as string,
    email,
    phone: (formData.get('phone') as string) || null,
    role: (formData.get('role') as string) || null,
    is_primary: false,
  })

  if (error) throw new Error('담당자 정보 저장 실패: ' + error.message)

  revalidatePath(`/admin/dealers/${dealerId}`)

  return { loginId: email, tempPassword }
}

/** 담당자 비밀번호 재설정 */
export async function resetDealerUserPassword(userId: string): Promise<{
  tempPassword: string
}> {
  await requireAdmin()
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // dealer_users에서 auth_user_id 조회
  const { data: user, error: fetchError } = await supabase
    .from('dealer_users')
    .select('auth_user_id')
    .eq('id', userId)
    .single()

  if (fetchError || !user?.auth_user_id) throw new Error('사용자를 찾을 수 없습니다.')

  const tempPassword = generateTempPassword()

  const { error } = await adminSupabase.auth.admin.updateUserById(user.auth_user_id, {
    password: tempPassword,
  })

  if (error) throw new Error('비밀번호 재설정 실패: ' + error.message)

  return { tempPassword }
}

/** 담당자 활성/비활성 */
export async function setDealerUserActive(userId: string, isActive: boolean) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('dealer_users')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) throw new Error('상태 변경 실패: ' + error.message)

  // dealer_id 알아내서 revalidate
  const { data } = await supabase.from('dealer_users').select('dealer_id').eq('id', userId).single()
  if (data) revalidatePath(`/admin/dealers/${data.dealer_id}`)
}

/** 담당자 삭제 (대표 담당자는 삭제 불가) */
export async function deleteDealerUser(userId: string) {
  await requireAdmin()
  const supabase = await createClient()

  // 대표 담당자 여부 확인
  const { data: user } = await supabase
    .from('dealer_users')
    .select('is_primary, dealer_id, auth_user_id')
    .eq('id', userId)
    .single()

  if (!user) throw new Error('담당자를 찾을 수 없습니다.')
  if (user.is_primary) throw new Error('대표 담당자는 삭제할 수 없습니다. 먼저 다른 담당자를 대표로 지정해주세요.')

  // Auth 사용자 삭제
  if (user.auth_user_id) {
    const adminSupabase = createAdminClient()
    await adminSupabase.auth.admin.deleteUser(user.auth_user_id)
  }

  const { error } = await supabase.from('dealer_users').delete().eq('id', userId)
  if (error) throw new Error('삭제 실패: ' + error.message)

  revalidatePath(`/admin/dealers/${user.dealer_id}`)
}

/** 대표 담당자 변경 */
export async function setPrimaryDealerUser(userId: string) {
  await requireAdmin()
  const supabase = await createClient()

  // 해당 담당자의 dealer_id 조회
  const { data: user } = await supabase
    .from('dealer_users')
    .select('dealer_id')
    .eq('id', userId)
    .single()

  if (!user) throw new Error('담당자를 찾을 수 없습니다.')

  // 기존 대표 담당자 해제
  await supabase
    .from('dealer_users')
    .update({ is_primary: false })
    .eq('dealer_id', user.dealer_id)
    .eq('is_primary', true)

  // 새 대표 담당자 설정
  const { error } = await supabase
    .from('dealer_users')
    .update({ is_primary: true })
    .eq('id', userId)

  if (error) throw new Error('대표 담당자 변경 실패: ' + error.message)

  revalidatePath(`/admin/dealers/${user.dealer_id}`)
}
