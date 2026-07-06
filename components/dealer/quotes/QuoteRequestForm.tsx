'use client'

/**
 * 견적 요청 작성/수정 폼 (3탭 구조)
 * 탭1: 기본 정보, 탭2: 구성 요구사항, 탭3: 배송 및 첨부
 */
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import SpecSlotInput from '@/components/shared/SpecSlotInput'
import { createEmptySpec } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { requestQuote, updateQuoteRequest } from '@/app/(dealer)/dealer/(protected)/quotes/actions'
import type { StandardPcSpec, DealerAddress, QuoteRequest } from '@/types/database'

const STORAGE_KEY = 'ipc-rfq-draft'

const PURPOSE_OPTIONS = [
  { value: 'office', label: '사무용' },
  { value: 'development', label: '개발/설계' },
  { value: 'video_editing', label: '영상편집' },
  { value: 'rendering', label: '3D 렌더링' },
  { value: 'gaming', label: '게이밍' },
  { value: 'server', label: '서버' },
  { value: 'etc', label: '기타' },
]

interface Props {
  addresses: DealerAddress[]
  dealerId: string
  initialData?: QuoteRequest | null
}

// 폼 상태 인터페이스
interface FormState {
  title: string
  purpose: string
  quantity: string
  budgetPerUnit: string
  desiredShipDate: string
  requirements: string
  specJson: StandardPcSpec
  addressId: string
  attachmentUrls: string[]
}

function getDefaultForm(addresses: DealerAddress[]): FormState {
  const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0]
  return {
    title: '',
    purpose: '',
    quantity: '1',
    budgetPerUnit: '',
    desiredShipDate: '',
    requirements: '',
    specJson: createEmptySpec(),
    addressId: defaultAddr?.id ?? '',
    attachmentUrls: [],
  }
}

function formFromRfq(rfq: QuoteRequest): FormState {
  return {
    title: rfq.title,
    purpose: rfq.purpose ?? '',
    quantity: String(rfq.quantity),
    budgetPerUnit: rfq.budget_per_unit ? String(rfq.budget_per_unit) : '',
    desiredShipDate: rfq.desired_ship_date ?? '',
    requirements: rfq.requirements ?? '',
    specJson: rfq.spec_json ?? createEmptySpec(),
    addressId: rfq.shipping_address_id ?? '',
    attachmentUrls: rfq.attachment_urls ?? [],
  }
}

export default function QuoteRequestForm({ addresses, dealerId, initialData }: Props) {
  const router = useRouter()
  const isEdit = !!initialData

  const [form, setForm] = useState<FormState>(
    initialData ? formFromRfq(initialData) : getDefaultForm(addresses)
  )
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showDraft, setShowDraft] = useState(false)

  const tabs = ['기본 정보', '구성 요구사항', '배송 및 첨부']

  // 임시저장 복원 확인 (새 작성 시만)
  useEffect(() => {
    if (isEdit) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setShowDraft(true)
    } catch { /* localStorage 접근 불가 무시 */ }
  }, [isEdit])

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as FormState
        setForm(parsed)
        toast.success('임시저장 내용을 불러왔습니다.')
      }
    } catch { /* 무시 */ }
    setShowDraft(false)
  }

  const saveDraft = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
      toast.success('임시저장되었습니다.')
    } catch { /* 무시 */ }
  }

  const clearDraft = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* 무시 */ }
  }

  // 폼 필드 업데이트 헬퍼
  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  // 파일 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    const maxFiles = 5
    if (form.attachmentUrls.length + files.length > maxFiles) {
      toast.error(`최대 ${maxFiles}개까지 업로드 가능합니다.`)
      return
    }

    setUploading(true)
    const supabase = createClient()
    const newUrls: string[] = []

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: 10MB 이하만 업로드 가능합니다.`)
        continue
      }

      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowed.includes(file.type)) {
        toast.error(`${file.name}: 이미지(JPG/PNG/WebP) 또는 PDF만 가능합니다.`)
        continue
      }

      const timestamp = Date.now()
      // 파일명에서 안전하지 않은 문자 제거 (한글/공백/괄호 등)
      const safeName = file.name
        .normalize('NFC')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
      const ext = safeName.includes('.') ? '' : (file.type === 'application/pdf' ? '.pdf' : '.bin')
      const path = `${dealerId}/${timestamp}_${safeName}${ext}`
      const { error } = await supabase.storage
        .from('rfq-attachments')
        .upload(path, file)

      if (error) {
        toast.error(`${file.name} 업로드 실패: ${error.message}`)
        continue
      }

      // 비공개 버킷이므로 public URL 이 아니라 "경로"를 저장한다.
      // 조회 시 서버에서 signed URL 로 변환한다.
      newUrls.push(path)
    }

    if (newUrls.length > 0) {
      update('attachmentUrls', [...form.attachmentUrls, ...newUrls])
    }
    setUploading(false)
    // input 리셋
    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    update('attachmentUrls', form.attachmentUrls.filter((_, i) => i !== index))
  }

  // 제출
  const handleSubmit = async () => {
    // 유효성 검증
    if (!form.title.trim()) { setActiveTab(0); toast.error('제목을 입력해주세요.'); return }
    if (!form.purpose) { setActiveTab(0); toast.error('용도를 선택해주세요.'); return }
    if (!form.quantity || Number(form.quantity) < 1) { setActiveTab(0); toast.error('수량을 1 이상 입력해주세요.'); return }
    if (!form.addressId) { setActiveTab(2); toast.error('배송지를 선택해주세요.'); return }

    // spec 최소 1개 슬롯
    const fixedKeys = ['cpu', 'mb', 'gpu', 'cooler', 'ram', 'ssd', 'hdd', 'case', 'psu', 'os', 'as'] as const
    const hasSpec = fixedKeys.some((k) => {
      const s = form.specJson[k]
      return s.name && s.qty > 0
    }) || (form.specJson.etc?.length > 0 && form.specJson.etc.some((e) => e.name))
    if (!hasSpec) { setActiveTab(1); toast.error('구성 요구사항에서 최소 1개 항목을 입력해주세요.'); return }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.set('title', form.title)
      fd.set('purpose', form.purpose)
      fd.set('quantity', form.quantity)
      fd.set('budget_per_unit', form.budgetPerUnit)
      fd.set('desired_ship_date', form.desiredShipDate)
      fd.set('requirements', form.requirements)
      fd.set('spec_json', JSON.stringify(form.specJson))
      fd.set('address_id', form.addressId)
      fd.set('attachment_urls', JSON.stringify(form.attachmentUrls))

      if (isEdit && initialData) {
        await updateQuoteRequest(initialData.id, fd)
        toast.success('견적 요청이 수정되었습니다.')
        router.push(`/dealer/quotes/${initialData.id}`)
      } else {
        const { rfqId } = await requestQuote(fd)
        clearDraft()
        toast.success('견적 요청이 제출되었습니다.')
        router.push(`/dealer/quotes/${rfqId}`)
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '처리 실패')
    } finally {
      setLoading(false)
    }
  }

  // 오늘 날짜 (최소 선택 가능)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-3xl space-y-6">
      {/* 탭 헤더 */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === i
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 탭 1: 기본 정보 */}
      {activeTab === 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목 *</Label>
              <Input
                id="title"
                placeholder="예) 사무용 PC 20대 견적 요청"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>용도 *</Label>
                <Select value={form.purpose} onValueChange={(v) => update('purpose', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="용도 선택" /></SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">수량 *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => update('quantity', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">대당 희망 예산 (선택)</Label>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  placeholder="1200000"
                  value={form.budgetPerUnit}
                  onChange={(e) => update('budgetPerUnit', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ship-date">희망 납기 (선택)</Label>
                <Input
                  id="ship-date"
                  type="date"
                  min={today}
                  value={form.desiredShipDate}
                  onChange={(e) => update('desiredShipDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">추가 요청 메모 (선택)</Label>
              <Textarea
                id="requirements"
                placeholder="구성 외 요청사항을 자유롭게 적어주세요 (보증 조건, 조립 옵션 등)"
                value={form.requirements}
                onChange={(e) => update('requirements', e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 탭 2: 구성 요구사항 */}
      {activeTab === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              원하는 부품 사양을 입력해주세요. 정확한 모델명이 없어도 괜찮습니다.
              예: &quot;i5급 이상&quot;, &quot;32GB 이상&quot; 등 조건으로 입력 가능합니다.
              빈 항목은 &quot;상관없음&quot;으로 처리됩니다.
            </div>
            <SpecSlotInput
              value={form.specJson}
              onChange={(next) => update('specJson', next)}
              mode="request"
            />
          </CardContent>
        </Card>
      )}

      {/* 탭 3: 배송 및 첨부 */}
      {activeTab === 2 && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* 배송지 선택 */}
            <div className="space-y-2">
              <Label>배송지 *</Label>
              {addresses.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  배송지를 먼저 등록해주세요.{' '}
                  <a href="/dealer/mypage/addresses" className="text-blue-600 underline">
                    배송지 관리
                  </a>
                </p>
              ) : (
                <Select value={form.addressId} onValueChange={(v) => update('addressId', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="배송지 선택" /></SelectTrigger>
                  <SelectContent>
                    {addresses.map((addr) => (
                      <SelectItem key={addr.id} value={addr.id}>
                        {addr.label} — {addr.recipient_name} ({addr.address})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 첨부파일 */}
            <div className="space-y-2">
              <Label>첨부파일 (선택, 최대 5개)</Label>
              <p className="text-xs text-zinc-400">
                요구사항 명세서, 참고 이미지 등을 업로드하세요. (10MB 이하, 이미지/PDF)
              </p>

              {form.attachmentUrls.length > 0 && (
                <ul className="space-y-1">
                  {form.attachmentUrls.map((url, i) => {
                    const fileName = decodeURIComponent(url.split('/').pop() ?? '').replace(/^\d+_/, '')
                    return (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="truncate flex-1 text-zinc-600">{fileName}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          className="text-xs text-red-500 hover:underline shrink-0"
                        >
                          삭제
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {form.attachmentUrls.length < 5 && (
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              )}
              {uploading && <p className="text-xs text-zinc-400">업로드 중...</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-3">
        {!isEdit && (
          <Button variant="outline" onClick={saveDraft} disabled={loading}>
            임시저장
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={loading || uploading}>
          {loading ? '처리 중...' : isEdit ? '수정 저장' : '견적 요청 제출'}
        </Button>
      </div>

      {/* 임시저장 복원 다이얼로그 */}
      <AlertDialog open={showDraft} onOpenChange={setShowDraft}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>임시저장 복원</AlertDialogTitle>
            <AlertDialogDescription>
              임시저장된 내용이 있습니다. 불러오시겠어요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { clearDraft(); setShowDraft(false) }}>
              아니오, 새로 작성
            </Button>
            <Button onClick={loadDraft}>
              불러오기
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
