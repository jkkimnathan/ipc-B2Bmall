'use server'

/**
 * 거래처 공개 가입신청 서버 액션
 *
 * 익명 사용자도 호출 가능하므로 service role 클라이언트 사용.
 * Auth 계정은 생성하지 않음 — 관리자 승인 시 생성.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidBusinessNo } from '@/lib/utils/format'

interface SignupResult {
  success: boolean
  error?: string
}

export async function submitDealerSignup(formData: FormData): Promise<SignupResult> {
  // 필수 필드 추출
  const companyName = formData.get('company_name') as string | null
  const businessNo = (formData.get('business_no') as string | null)?.replace(/\D/g, '') ?? ''
  const ceoName = formData.get('ceo_name') as string | null
  const businessType = formData.get('business_type') as string | null
  const businessItem = formData.get('business_item') as string | null
  const postalCode = formData.get('postal_code') as string | null
  const address = formData.get('address') as string | null
  const phone = formData.get('phone') as string | null

  const userName = formData.get('user_name') as string | null
  const userEmail = formData.get('user_email') as string | null
  const userPhone = formData.get('user_phone') as string | null
  const userRole = formData.get('user_role') as string | null

  const certFile = formData.get('business_cert') as File | null

  const agreePrivacy = formData.get('agree_privacy') === 'true'
  const agreeTerms = formData.get('agree_terms') === 'true'

  // 서버 측 검증
  if (!companyName?.trim()) return { success: false, error: '상호명을 입력해주세요.' }
  if (!businessNo || !isValidBusinessNo(businessNo)) {
    return { success: false, error: '유효한 사업자번호를 입력해주세요.' }
  }
  if (!ceoName?.trim()) return { success: false, error: '대표자명을 입력해주세요.' }
  if (!userName?.trim()) return { success: false, error: '담당자명을 입력해주세요.' }
  if (!userEmail?.trim()) return { success: false, error: '이메일을 입력해주세요.' }
  if (!userPhone?.trim()) return { success: false, error: '휴대폰 번호를 입력해주세요.' }
  if (!agreePrivacy || !agreeTerms) return { success: false, error: '약관에 동의해주세요.' }

  const supabase = createAdminClient()

  // 사업자번호 중복 체크
  const { data: existingDealer } = await supabase
    .from('dealers')
    .select('id')
    .eq('business_no', businessNo)
    .maybeSingle()

  if (existingDealer) {
    return { success: false, error: '이미 등록된 사업자번호입니다.' }
  }

  // 이메일 중복 체크 (dealer_users 테이블)
  const { data: existingEmail } = await supabase
    .from('dealer_users')
    .select('id')
    .eq('email', userEmail!.trim())
    .maybeSingle()

  if (existingEmail) {
    return { success: false, error: '이미 등록된 이메일입니다.' }
  }

  // 사업자등록증 업로드
  let certUrl: string | null = null
  if (certFile && certFile.size > 0) {
    const ext = certFile.name.split('.').pop() ?? 'pdf'
    const path = `signup/${Date.now()}_${businessNo}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('dealer-documents')
      .upload(path, certFile, { contentType: certFile.type })

    if (uploadError) {
      return { success: false, error: '사업자등록증 업로드 실패: ' + uploadError.message }
    }

    // 비공개 버킷이므로 signed URL이 아닌 path만 저장
    certUrl = path
  }

  // 거래처 INSERT (status='pending')
  const { data: newDealer, error: dealerError } = await supabase
    .from('dealers')
    .insert({
      company_name: companyName!.trim(),
      business_no: businessNo,
      ceo_name: ceoName!.trim(),
      business_type: businessType?.trim() || null,
      business_item: businessItem?.trim() || null,
      postal_code: postalCode?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: userEmail!.trim(),
      status: 'pending',
      business_cert_url: certUrl,
    })
    .select('id')
    .single()

  if (dealerError || !newDealer) {
    return { success: false, error: '가입신청 등록 실패: ' + (dealerError?.message ?? '') }
  }

  // 첫 담당자 INSERT (auth_user_id는 null — 관리자 승인 시 생성)
  const { error: userError } = await supabase
    .from('dealer_users')
    .insert({
      dealer_id: newDealer.id,
      login_id: userEmail!.trim(),
      name: userName!.trim(),
      email: userEmail!.trim(),
      phone: userPhone!.trim(),
      role: userRole?.trim() || null,
      is_primary: true,
      is_active: false, // 관리자 승인 전까지 비활성
    })

  if (userError) {
    return { success: false, error: '담당자 등록 실패: ' + userError.message }
  }

  return { success: true }
}
