'use client'

/**
 * 거래처 등록/수정 공용 폼 컴포넌트
 * mode="create"일 때 첫 담당자 섹션 표시, "edit"일 때 숨김.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { createDealerWithUser, updateDealer } from '@/app/(admin)/admin/(dashboard)/dealers/actions'
import { isValidBusinessNo, formatBusinessNo } from '@/lib/utils/format'
import CredentialDialog from './CredentialDialog'
import type { Dealer } from '@/types/database'

interface DealerFormProps {
  mode: 'create' | 'edit'
  initialData?: Dealer
}

export default function DealerForm({ mode, initialData }: DealerFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // 사업자 정보
  const [companyName, setCompanyName] = useState(initialData?.company_name ?? '')
  const [businessNo, setBusinessNo] = useState(initialData?.business_no ?? '')
  const [ceoName, setCeoName] = useState(initialData?.ceo_name ?? '')
  const [businessType, setBusinessType] = useState(initialData?.business_type ?? '')
  const [businessItem, setBusinessItem] = useState(initialData?.business_item ?? '')
  const [postalCode, setPostalCode] = useState(initialData?.postal_code ?? '')
  const [address, setAddress] = useState(initialData?.address ?? '')
  const [phone, setPhone] = useState(initialData?.phone ?? '')

  // 첫 담당자 (create 모드만)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRole, setContactRole] = useState('')

  // 사업자등록증
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certUrl, setCertUrl] = useState(initialData?.business_cert_url ?? '')

  // 메모
  const [memo, setMemo] = useState(initialData?.memo ?? '')

  // 임시 비번 다이얼로그
  const [credDialog, setCredDialog] = useState<{
    open: boolean; loginId: string; tempPassword: string; dealerId: string
  }>({ open: false, loginId: '', tempPassword: '', dealerId: '' })

  // 사업자번호 자동 포맷
  const handleBusinessNoChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10)
    setBusinessNo(digits)
  }

  const displayBusinessNo = businessNo.length === 10
    ? formatBusinessNo(businessNo)
    : businessNo

  // 검증
  const validate = (): string | null => {
    if (!companyName.trim()) return '상호를 입력해주세요.'
    if (!businessNo || businessNo.replace(/\D/g, '').length !== 10) return '사업자번호 10자리를 입력해주세요.'
    if (!isValidBusinessNo(businessNo)) return '유효하지 않은 사업자번호입니다.'
    if (mode === 'create') {
      if (!contactName.trim()) return '담당자명을 입력해주세요.'
      if (!contactEmail.trim()) return '담당자 이메일을 입력해주세요.'
      if (!contactPhone.trim()) return '담당자 휴대폰을 입력해주세요.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { toast.error(err); return }

    setSaving(true)
    try {
      // 사업자등록증 업로드
      let finalCertUrl = certUrl
      if (certFile) {
        const supabase = createClient()
        const ext = certFile.name.split('.').pop() ?? 'pdf'
        const path = `${businessNo.replace(/\D/g, '')}_cert_${Date.now()}.${ext}`

        const { error: upErr } = await supabase.storage
          .from('dealer-documents')
          .upload(path, certFile)

        if (upErr) throw new Error('사업자등록증 업로드 실패: ' + upErr.message)

        const { data: urlData } = supabase.storage
          .from('dealer-documents')
          .getPublicUrl(path)
        finalCertUrl = urlData.publicUrl
      }

      // FormData 구성
      const formData = new FormData()
      formData.set('company_name', companyName.trim())
      formData.set('business_no', businessNo)
      formData.set('ceo_name', ceoName)
      formData.set('business_type', businessType)
      formData.set('business_item', businessItem)
      formData.set('postal_code', postalCode)
      formData.set('address', address)
      formData.set('phone', phone)
      formData.set('business_cert_url', finalCertUrl)
      formData.set('memo', memo)

      if (mode === 'create') {
        formData.set('contact_name', contactName.trim())
        formData.set('contact_email', contactEmail.trim())
        formData.set('contact_phone', contactPhone)
        formData.set('contact_role', contactRole)

        const result = await createDealerWithUser(formData)
        setCredDialog({
          open: true,
          loginId: result.loginId,
          tempPassword: result.tempPassword,
          dealerId: result.dealerId,
        })
      } else {
        formData.set('contact_name', initialData?.contact_name ?? '')
        formData.set('contact_email', initialData?.email ?? '')
        await updateDealer(initialData!.id, formData)
        toast.success('거래처 정보가 수정되었습니다.')
        router.push(`/admin/dealers/${initialData!.id}`)
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* 섹션 1: 사업자 정보 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">사업자 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>상호 *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="㈜한국유통" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>사업자등록번호 *</Label>
              <Input
                value={displayBusinessNo}
                onChange={(e) => handleBusinessNoChange(e.target.value)}
                placeholder="123-45-67890"
                maxLength={12}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label>대표자명</Label>
              <Input value={ceoName} onChange={(e) => setCeoName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>업태</Label>
              <Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>종목</Label>
              <Input value={businessItem} onChange={(e) => setBusinessItem(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label>대표 전화</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-1234-5678" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>우편번호</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div className="col-span-1" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>주소</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="서울시 강남구..." />
          </div>
        </section>

        {/* 섹션 2: 첫 담당자 (create만) */}
        {mode === 'create' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">첫 담당자 정보</h2>
            <p className="text-sm text-zinc-500">이 담당자가 대표 담당자로 지정되며, 입력한 이메일이 로그인 ID가 됩니다.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>담당자명 *</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="김철수" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>이메일 (로그인 ID) *</Label>
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="partner@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>휴대폰 *</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="010-1234-5678" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>직책</Label>
                <Input value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="구매 담당" />
              </div>
            </div>
          </section>
        )}

        {/* 섹션 3: 사업자등록증 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">사업자등록증</h2>
          {certUrl && !certFile && (
            <p className="text-sm text-zinc-500">기존 파일이 등록되어 있습니다. 새 파일을 선택하면 교체됩니다.</p>
          )}
          <Input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-zinc-400">JPG, PNG, PDF / 최대 10MB</p>
        </section>

        {/* 섹션 4: 내부 메모 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">내부 메모</h2>
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="관리자만 보는 메모 (선택)" rows={3} />
        </section>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/dealers')} disabled={saving}>
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? '저장 중...' : mode === 'create' ? '등록' : '수정'}
          </Button>
        </div>
      </form>

      {/* 임시 비번 다이얼로그 */}
      <CredentialDialog
        open={credDialog.open}
        loginId={credDialog.loginId}
        tempPassword={credDialog.tempPassword}
        onClose={() => {
          setCredDialog((prev) => ({ ...prev, open: false }))
          router.push(`/admin/dealers/${credDialog.dealerId}`)
          router.refresh()
        }}
      />
    </>
  )
}
