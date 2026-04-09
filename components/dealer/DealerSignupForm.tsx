'use client'

/**
 * 거래처 가입신청 폼
 * 사업자 정보 + 담당자 정보 + 사업자등록증 + 약관 동의
 */
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, X, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { isValidBusinessNo, formatBusinessNo } from '@/lib/utils/format'
import { submitDealerSignup } from '@/app/(dealer)/dealer/signup/actions'

export default function DealerSignupForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)

  // 사업자 정보
  const [companyName, setCompanyName] = useState('')
  const [businessNo, setBusinessNo] = useState('')
  const [ceoName, setCeoName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessItem, setBusinessItem] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  // 담당자 정보
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userRole, setUserRole] = useState('')

  // 파일
  const [certFile, setCertFile] = useState<File | null>(null)

  // 약관
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  // 사업자번호 자동 포맷
  const handleBusinessNoChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10)
    setBusinessNo(digits.length === 10 ? formatBusinessNo(digits) : digits)
  }

  // 파일 선택 처리
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.')
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowed.includes(file.type)) {
      toast.error('JPG, PNG 또는 PDF 파일만 업로드 가능합니다.')
      return
    }
    setCertFile(file)
  }

  const handleSubmit = async () => {
    // 클라이언트 검증
    if (!companyName.trim()) { toast.error('상호명을 입력해주세요.'); return }
    const rawNo = businessNo.replace(/\D/g, '')
    if (!isValidBusinessNo(rawNo)) { toast.error('유효한 사업자번호를 입력해주세요.'); return }
    if (!ceoName.trim()) { toast.error('대표자명을 입력해주세요.'); return }
    if (!userName.trim()) { toast.error('담당자명을 입력해주세요.'); return }
    if (!userEmail.trim()) { toast.error('이메일을 입력해주세요.'); return }
    if (!userPhone.trim()) { toast.error('휴대폰 번호를 입력해주세요.'); return }
    if (!certFile) { toast.error('사업자등록증을 첨부해주세요.'); return }
    if (!agreePrivacy || !agreeTerms) { toast.error('약관에 동의해주세요.'); return }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('company_name', companyName.trim())
      formData.set('business_no', rawNo)
      formData.set('ceo_name', ceoName.trim())
      formData.set('business_type', businessType)
      formData.set('business_item', businessItem)
      formData.set('postal_code', postalCode)
      formData.set('address', address)
      formData.set('phone', phone)
      formData.set('user_name', userName.trim())
      formData.set('user_email', userEmail.trim())
      formData.set('user_phone', userPhone.trim())
      formData.set('user_role', userRole)
      formData.set('business_cert', certFile)
      formData.set('agree_privacy', String(agreePrivacy))
      formData.set('agree_terms', String(agreeTerms))

      const result = await submitDealerSignup(formData)

      if (!result.success) {
        toast.error(result.error ?? '가입신청 실패')
        return
      }

      router.push('/dealer/signup/complete')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '가입신청 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 섹션 1: 사업자 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">사업자 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>상호 *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="(주)OO유통" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>사업자등록번호 *</Label>
              <Input value={businessNo} onChange={(e) => handleBusinessNoChange(e.target.value)} placeholder="123-45-67890" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label>대표자명 *</Label>
              <Input value={ceoName} onChange={(e) => setCeoName(e.target.value)} placeholder="홍길동" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>업태</Label>
              <Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="도소매" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>종목</Label>
              <Input value={businessItem} onChange={(e) => setBusinessItem(e.target.value)} placeholder="컴퓨터 및 주변기기" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label>대표 전화</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-1234-5678" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>우편번호</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="06234" />
            </div>
            <div className="col-span-1 flex flex-col gap-2">
              <Label>주소</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="서울시 강남구..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 섹션 2: 담당자 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">담당자 정보</CardTitle>
          <p className="text-xs text-zinc-400">승인 시 이 담당자에게 로그인 계정이 발급됩니다.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>담당자명 *</Label>
              <Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="김철수" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>이메일 (로그인 ID) *</Label>
              <Input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="kim@company.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>휴대폰 *</Label>
              <Input value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="010-1234-5678" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>직책</Label>
              <Input value={userRole} onChange={(e) => setUserRole(e.target.value)} placeholder="구매담당" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 섹션 3: 사업자등록증 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">사업자등록증 첨부 *</CardTitle>
          <p className="text-xs text-zinc-400">JPG, PNG 또는 PDF (10MB 이하)</p>
        </CardHeader>
        <CardContent>
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFileSelect} />
          {certFile ? (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <FileText className="size-5 text-zinc-400" />
              <span className="flex-1 text-sm truncate">{certFile.name}</span>
              <span className="text-xs text-zinc-400">{(certFile.size / 1024 / 1024).toFixed(1)}MB</span>
              <Button variant="ghost" size="sm" onClick={() => { setCertFile(null); if (fileRef.current) fileRef.current.value = '' }}>
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-zinc-200 p-8 text-center hover:border-zinc-400 transition-colors"
            >
              <Upload className="size-8 mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-500">클릭하여 파일을 선택하세요</p>
            </button>
          )}
        </CardContent>
      </Card>

      {/* 섹션 4: 약관 동의 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">약관 동의</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={agreePrivacy} onCheckedChange={(v) => setAgreePrivacy(v === true)} />
            <span className="text-sm">개인정보 수집 및 이용에 동의합니다 (필수)</span>
            <a href="#" className="text-xs text-blue-600 hover:underline ml-auto">전문보기</a>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(v === true)} />
            <span className="text-sm">B2B 거래 약관에 동의합니다 (필수)</span>
            <a href="#" className="text-xs text-blue-600 hover:underline ml-auto">전문보기</a>
          </label>
        </CardContent>
      </Card>

      {/* 제출 버튼 */}
      <div className="flex justify-center">
        <Button size="lg" onClick={handleSubmit} disabled={submitting} className="w-64">
          {submitting ? '신청 중...' : '가입신청'}
        </Button>
      </div>
    </div>
  )
}
