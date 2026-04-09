'use client'

/**
 * 관리자 견적서 작성 패널
 *
 * - SpecSlotInput (mode="proposal") + 요청사양 복사 버튼
 * - 제안 사양 자유 텍스트
 * - 단가 / 수량 / VAT / 자동 합계
 * - 납기일 / 유효기한
 * - 거래처 안내 메모 / 내부 메모
 * - [임시저장] / [견적 발송] 버튼
 */
import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Save, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import SpecSlotInput from '@/components/shared/SpecSlotInput'
import { formatKRW, calcValidUntil } from '@/lib/utils/format'
import { saveQuoteDraft, sendQuote } from '@/app/(admin)/admin/(dashboard)/quotes/actions'
import type { QuoteRequest, Quote, StandardPcSpec } from '@/types/database'

interface QuoteComposerProps {
  rfq: QuoteRequest
  existingQuote: Quote | null
}

export default function QuoteComposer({ rfq, existingQuote }: QuoteComposerProps) {
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const [sending, startSending] = useTransition()

  // 사양 (기존 견적서가 있으면 그 값, 없으면 빈값)
  const [specJson, setSpecJson] = useState<StandardPcSpec>(
    existingQuote?.spec_json ?? rfq.spec_json
  )
  const [proposedSpec, setProposedSpec] = useState(existingQuote?.proposed_spec ?? '')
  const [unitPrice, setUnitPrice] = useState(existingQuote?.unit_price?.toString() ?? '')
  const [quantity, setQuantity] = useState(existingQuote?.quantity ?? rfq.quantity)
  const [vatIncluded, setVatIncluded] = useState(existingQuote?.vat_included ?? true)
  const [leadTimeDays, setLeadTimeDays] = useState(existingQuote?.lead_time_days ?? 7)
  const [validDays, setValidDays] = useState(7)
  const [adminMemo, setAdminMemo] = useState(existingQuote?.admin_memo ?? '')

  const [showSendConfirm, setShowSendConfirm] = useState(false)

  const parsedUnitPrice = Number(unitPrice.replace(/,/g, '')) || 0
  const totalAmount = parsedUnitPrice * quantity

  // 요청 사양 복사
  const copyRequestSpec = useCallback(() => {
    setSpecJson({ ...rfq.spec_json })
    toast.success('요청 사양이 복사되었습니다.')
  }, [rfq.spec_json])

  // 단가 입력 (콤마 포맷)
  const handleUnitPriceChange = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '')
    if (!digits) { setUnitPrice(''); return }
    setUnitPrice(Number(digits).toLocaleString('ko-KR'))
  }

  // FormData 빌드
  const buildFormData = (): FormData => {
    const fd = new FormData()
    fd.set('spec_json', JSON.stringify(specJson))
    fd.set('proposed_spec', proposedSpec)
    fd.set('unit_price', String(parsedUnitPrice))
    fd.set('quantity', String(quantity))
    fd.set('vat_included', String(vatIncluded))
    fd.set('lead_time_days', String(leadTimeDays))
    fd.set('valid_days', String(validDays))
    fd.set('admin_memo', adminMemo)
    return fd
  }

  // 임시저장
  const handleSaveDraft = () => {
    if (parsedUnitPrice <= 0) { toast.error('단가를 입력해주세요.'); return }
    startSaving(async () => {
      try {
        await saveQuoteDraft(rfq.id, buildFormData())
        toast.success('임시저장 완료')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '임시저장 실패')
      }
    })
  }

  // 발송
  const handleSend = () => {
    if (parsedUnitPrice <= 0) { toast.error('단가를 입력해주세요.'); return }
    setShowSendConfirm(true)
  }

  const confirmSend = () => {
    setShowSendConfirm(false)
    startSending(async () => {
      try {
        await sendQuote(rfq.id, buildFormData())
        toast.success('견적서가 발송되었습니다.')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '발송 실패')
      }
    })
  }

  const isSent = existingQuote?.status === 'sent'
  const isDisabled = saving || sending

  return (
    <div className="space-y-5">
      {/* 제안 사양 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">제안 사양</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={copyRequestSpec}>
              <Copy className="size-3.5" /> 요청 사양 복사
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SpecSlotInput
            value={specJson}
            onChange={setSpecJson}
            mode="proposal"
            disabled={isDisabled}
          />
          <div>
            <Label className="text-sm">추가 설명 (자유 텍스트)</Label>
            <Textarea
              placeholder="사양에 대한 추가 설명, 대체품 안내 등"
              value={proposedSpec}
              onChange={(e) => setProposedSpec(e.target.value)}
              rows={3}
              className="mt-1"
              disabled={isDisabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* 가격 정보 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">가격 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">대당 단가 (원)</Label>
              <Input
                placeholder="0"
                value={unitPrice}
                onChange={(e) => handleUnitPriceChange(e.target.value)}
                className="mt-1"
                disabled={isDisabled}
              />
            </div>
            <div>
              <Label className="text-sm">수량 (대)</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1"
                disabled={isDisabled}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="vat"
              checked={vatIncluded}
              onCheckedChange={(v) => setVatIncluded(!!v)}
              disabled={isDisabled}
            />
            <Label htmlFor="vat" className="text-sm">VAT 포함</Label>
          </div>

          <div className="rounded-lg bg-zinc-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">단가</span>
              <span>{parsedUnitPrice > 0 ? formatKRW(parsedUnitPrice) : '—'}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-zinc-500">수량</span>
              <span>{quantity}대</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t font-semibold">
              <span>합계 {vatIncluded ? '(VAT 포함)' : '(VAT 별도)'}</span>
              <span className="text-blue-600">
                {totalAmount > 0 ? formatKRW(totalAmount) : '—'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 납기 / 유효기한 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">납기 / 유효기한</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">납기 (영업일)</Label>
              <Input
                type="number"
                min={1}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1"
                disabled={isDisabled}
              />
            </div>
            <div>
              <Label className="text-sm">견적 유효기간</Label>
              <Select
                value={String(validDays)}
                onValueChange={(v) => setValidDays(Number(v))}
                disabled={isDisabled}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3일</SelectItem>
                  <SelectItem value="7">7일</SelectItem>
                  <SelectItem value="14">14일</SelectItem>
                  <SelectItem value="30">30일</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-400 mt-1">
                유효기한: {calcValidUntil(validDays)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메모 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">메모</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">내부 메모 (비공개)</Label>
            <Textarea
              placeholder="거래처에 보이지 않는 내부 메모"
              value={adminMemo}
              onChange={(e) => setAdminMemo(e.target.value)}
              rows={2}
              className="mt-1"
              disabled={isDisabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex gap-3 sticky bottom-0 bg-white py-3 border-t">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isDisabled}
          className="flex-1"
        >
          <Save className="size-4" />
          {saving ? '저장 중...' : '임시저장'}
        </Button>
        <Button
          onClick={handleSend}
          disabled={isDisabled}
          className="flex-1"
        >
          <Send className="size-4" />
          {sending ? '발송 중...' : isSent ? '재견적 발송' : '견적 발송'}
        </Button>
      </div>

      {/* 발송 확인 다이얼로그 */}
      <AlertDialog open={showSendConfirm} onOpenChange={(v) => { if (!v) setShowSendConfirm(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSent ? '재견적 발송' : '견적서 발송'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isSent
                ? '수정된 견적서를 거래처에 재발송합니다. 계속하시겠습니까?'
                : `${rfq.rfq_no}에 대한 견적서를 발송합니다. 거래처에서 즉시 확인할 수 있습니다.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg bg-zinc-50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">단가</span>
              <span>{formatKRW(parsedUnitPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">수량</span>
              <span>{quantity}대</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t">
              <span>합계</span>
              <span>{formatKRW(totalAmount)}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowSendConfirm(false)}>
              취소
            </Button>
            <Button onClick={confirmSend}>
              {isSent ? '재발송' : '발송'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
