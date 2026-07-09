'use server'

/**
 * 거래처 마이페이지 서버 액션
 * 모든 액션에서 requireDealer()로 본인 dealer_id만 접근 가능하도록 보장.
 */
import { revalidatePath } from 'next/cache'
import { requireDealer } from '@/lib/auth/dealer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidEmail } from '@/lib/utils/format'
import { validateCertFile } from '@/lib/uploads/certFile'

const REVALIDATE_PATH = '/dealer/mypage'

/** 거래처 연락처/주소 수정 (주소만 변경 가능) */
export async function updateMyDealer(formData: FormData) {
  const session = await requireDealer()
  const supabase = await createClient()

  const postalCode = formData.get('postal_code') as string | null
  const address = formData.get('address') as string | null
  const phone = formData.get('phone') as string | null

  const { error } = await supabase
    .from('dealers')
    .update({
      postal_code: postalCode?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
    })
    .eq('id', session.dealer.id)

  if (error) throw new Error('수정 실패: ' + error.message)
  revalidatePath(REVALIDATE_PATH)
}

/** 사업자등록증 재업로드 */
export async function updateBusinessCert(formData: FormData) {
  const session = await requireDealer()
  const supabase = createAdminClient()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) throw new Error('파일을 선택해주세요.')

  // 서버측 파일 검증 (형식/크기/매직바이트) — 가입 신청과 동일한 공용 헬퍼 사용
  const validated = await validateCertFile(file)
  if (!validated.ok) throw new Error(validated.error)

  const path = `certs/${session.dealer.id}/${Date.now()}.${validated.ext}`

  // 새 파일 먼저 업로드 → DB 갱신 → 성공 후 기존 파일 삭제
  // (중간 실패 시 기존 등록증이 유실되지 않도록)
  const { error: uploadError } = await supabase.storage
    .from('dealer-documents')
    .upload(path, validated.bytes, { contentType: validated.contentType })

  if (uploadError) throw new Error('업로드 실패: ' + uploadError.message)

  const previousPath = session.dealer.business_cert_url

  const { error } = await supabase
    .from('dealers')
    .update({ business_cert_url: path })
    .eq('id', session.dealer.id)

  if (error) {
    // DB 갱신 실패 시 새로 올린 파일 정리
    await supabase.storage.from('dealer-documents').remove([path])
    throw new Error('저장 실패: ' + error.message)
  }

  if (previousPath) {
    await supabase.storage.from('dealer-documents').remove([previousPath])
  }

  revalidatePath(REVALIDATE_PATH)
}

/** 본인 거래처에 담당자 추가 신청 (대표 담당자만) */
export async function requestAddDealerUser(formData: FormData) {
  const session = await requireDealer()

  // 대표 담당자 여부 확인
  if (!session.dealerUser.is_primary) {
    throw new Error('대표 담당자만 담당자를 추가할 수 있습니다.')
  }

  const name = formData.get('name') as string | null
  const email = formData.get('email') as string | null
  const phone = formData.get('phone') as string | null
  const role = formData.get('role') as string | null

  if (!name?.trim()) throw new Error('담당자명을 입력해주세요.')
  if (!email?.trim()) throw new Error('이메일을 입력해주세요.')
  if (!isValidEmail(email)) throw new Error('올바른 이메일 형식이 아닙니다.')

  // 쓰기는 service_role 로 수행 (거래처 직접 쓰기 정책 제거). 전역 중복 확인도
  // service_role 이어야 타 거래처에 이미 쓰인 이메일까지 감지할 수 있다.
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('dealer_users')
    .select('id')
    .eq('email', email!.trim())
    .maybeSingle()

  if (existing) throw new Error('이미 등록된 이메일입니다.')

  const { error } = await admin
    .from('dealer_users')
    .insert({
      dealer_id: session.dealer.id,
      login_id: email!.trim(),
      name: name!.trim(),
      email: email!.trim(),
      phone: phone?.trim() || null,
      role: role?.trim() || null,
      is_primary: false,
      is_active: false, // 관리자 승인 대기
    })

  if (error) throw new Error('추가 실패: ' + error.message)
  revalidatePath(REVALIDATE_PATH + '/users')
}

/** 본인 거래처의 다른 담당자 비활성화 (대표 담당자만) */
export async function deactivateMyDealerUser(userId: string) {
  const session = await requireDealer()

  if (!session.dealerUser.is_primary) {
    throw new Error('대표 담당자만 변경할 수 있습니다.')
  }

  // 본인은 비활성화 불가
  if (userId === session.dealerUser.id) {
    throw new Error('본인 계정은 비활성화할 수 없습니다.')
  }

  const admin = createAdminClient()

  // 같은 거래처 소속인지 확인
  const { data: target } = await admin
    .from('dealer_users')
    .select('dealer_id')
    .eq('id', userId)
    .single()

  if (!target || target.dealer_id !== session.dealer.id) {
    throw new Error('권한이 없습니다.')
  }

  const { error } = await admin
    .from('dealer_users')
    .update({ is_active: false })
    .eq('id', userId)

  if (error) throw new Error('비활성화 실패: ' + error.message)
  revalidatePath(REVALIDATE_PATH + '/users')
}
