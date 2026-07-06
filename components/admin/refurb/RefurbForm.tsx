'use client'

/**
 * 리퍼 부품 등록/수정 공용 폼 컴포넌트
 * 누구나 쉽게 등록할 수 있도록 탭 없이 한 화면 스크롤 형태로 구성한다.
 * 섹션: 기본정보 / 판매·재고 / 이미지
 * 이미지 업로드 → 서버 액션 호출 순서로 처리한다.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import ThumbnailUploader from '@/components/admin/products/ThumbnailUploader'
import DetailImageUploader from '@/components/admin/products/DetailImageUploader'
import { createRefurbPart, updateRefurbPart } from '@/app/(admin)/admin/(dashboard)/refurb/actions'

import { partTypeLabel, conditionGradeLabel, discountRate } from '@/lib/utils/format'
import type { RefurbPart, PartType, ConditionGrade } from '@/types/database'

interface RefurbFormProps {
  mode: 'create' | 'edit'
  initialData?: RefurbPart
}

const PART_TYPES: PartType[] = [
  'cpu', 'gpu', 'ram', 'ssd', 'hdd', 'mb', 'psu', 'case', 'cooler', 'monitor', 'etc',
]

const CONDITION_GRADES: ConditionGrade[] = ['S', 'A', 'B']

export default function RefurbForm({ mode, initialData }: RefurbFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // 기본 정보 상태
  const [sku, setSku] = useState(initialData?.sku ?? '')
  const [name, setName] = useState(initialData?.name ?? '')
  const [partType, setPartType] = useState<PartType | ''>(initialData?.part_type ?? '')
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>(initialData?.condition_grade ?? 'A')
  const [manufacturer, setManufacturer] = useState(initialData?.manufacturer ?? '')
  const [specSummary, setSpecSummary] = useState(initialData?.spec_summary ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')

  // 판매·재고 상태
  const [marketPrice, setMarketPrice] = useState(initialData?.market_price?.toString() ?? '')
  const [salePrice, setSalePrice] = useState(initialData?.sale_price?.toString() ?? '')
  const [stockQuantity, setStockQuantity] = useState(initialData?.stock_quantity?.toString() ?? '0')
  const [warrantyMonths, setWarrantyMonths] = useState(initialData?.warranty_months?.toString() ?? '3')
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)

  // 이미지 상태 (기존 URL + 새 파일)
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>(initialData?.thumbnail_urls ?? [])
  const [thumbnailFiles, setThumbnailFiles] = useState<File[]>([])
  const [detailUrl, setDetailUrl] = useState<string | null>(initialData?.detail_image_url ?? null)
  const [detailFile, setDetailFile] = useState<File | null>(null)

  // 수정 모드에서 삭제된 기존 이미지 URL 추적
  const [removedThumbnails, setRemovedThumbnails] = useState<string[]>([])
  const [removedDetail, setRemovedDetail] = useState<string | null>(null)

  // 썸네일 변경 핸들러
  const handleThumbnailChange = (urls: string[], files: File[]) => {
    const removed = (initialData?.thumbnail_urls ?? []).filter((u) => !urls.includes(u))
    setRemovedThumbnails(removed)
    setThumbnailUrls(urls)
    setThumbnailFiles(files)
  }

  // 상세 이미지 변경 핸들러
  const handleDetailChange = (url: string | null, file: File | null) => {
    if (!url && !file && initialData?.detail_image_url) {
      setRemovedDetail(initialData.detail_image_url)
    }
    setDetailUrl(url)
    setDetailFile(file)
  }

  // 가격 입력 핸들러 (숫자만 허용)
  const handleMarketPriceChange = (val: string) => setMarketPrice(val.replace(/[^0-9]/g, ''))
  const handleSalePriceChange = (val: string) => setSalePrice(val.replace(/[^0-9]/g, ''))

  const displayMarketPrice = marketPrice ? Number(marketPrice).toLocaleString('ko-KR') : ''
  const displaySalePrice = salePrice ? Number(salePrice).toLocaleString('ko-KR') : ''

  // 할인율 힌트 (신품 시세와 판매가가 모두 있을 때)
  const rate = discountRate(
    marketPrice ? Number(marketPrice) : null,
    salePrice ? Number(salePrice) : 0,
  )

  // 검증
  const validate = (): string | null => {
    if (!sku.trim()) return 'SKU를 입력해주세요.'
    if (!name.trim()) return '부품명을 입력해주세요.'
    if (!partType) return '부품 종류를 선택해주세요.'
    if (!conditionGrade) return '등급을 선택해주세요.'
    if (!salePrice || Number(salePrice) <= 0) return '판매가를 입력해주세요.'
    if (thumbnailUrls.length + thumbnailFiles.length === 0) {
      return '썸네일 이미지를 1장 이상 업로드해주세요.'
    }
    return null
  }

  // 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const err = validate()
    if (err) { toast.error(err); return }

    setSaving(true)
    try {
      const supabase = createClient()
      const timestamp = Date.now()

      // 1. 새 썸네일 파일 업로드
      const uploadedThumbUrls = [...thumbnailUrls]
      for (let i = 0; i < thumbnailFiles.length; i++) {
        const file = thumbnailFiles[i]
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${sku.trim()}_thumb_${i}_${timestamp}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('product-thumbnails')
          .upload(path, file)

        if (uploadError) throw new Error(`썸네일 업로드 실패: ${uploadError.message}`)

        const { data: urlData } = supabase.storage
          .from('product-thumbnails')
          .getPublicUrl(path)

        uploadedThumbUrls.push(urlData.publicUrl)
      }

      // 2. 새 상세 이미지 업로드
      let finalDetailUrl = detailUrl
      if (detailFile) {
        const ext = detailFile.name.split('.').pop() ?? 'jpg'
        const path = `${sku.trim()}_detail_${timestamp}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('product-details')
          .upload(path, detailFile)

        if (uploadError) throw new Error(`상세 이미지 업로드 실패: ${uploadError.message}`)

        const { data: urlData } = supabase.storage
          .from('product-details')
          .getPublicUrl(path)

        finalDetailUrl = urlData.publicUrl
      }

      // 3. FormData 구성
      const formData = new FormData()
      formData.set('sku', sku.trim())
      formData.set('name', name.trim())
      formData.set('part_type', partType)
      formData.set('condition_grade', conditionGrade)
      formData.set('manufacturer', manufacturer.trim())
      formData.set('spec_summary', specSummary.trim())
      formData.set('description', description)
      formData.set('thumbnail_urls', JSON.stringify(uploadedThumbUrls))
      formData.set('detail_image_url', finalDetailUrl ?? '')
      formData.set('market_price', marketPrice)
      formData.set('sale_price', salePrice)
      formData.set('stock_quantity', stockQuantity || '0')
      formData.set('warranty_months', warrantyMonths || '3')
      formData.set('is_active', String(isActive))

      // 수정 모드: 삭제된 이미지 정보 포함
      if (mode === 'edit') {
        formData.set('removed_thumbnails', JSON.stringify(removedThumbnails))
        formData.set('removed_detail', removedDetail ?? '')
      }

      // 4. 서버 액션 호출
      const result = mode === 'create'
        ? await createRefurbPart(formData)
        : await updateRefurbPart(initialData!.id, formData)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(
        mode === 'create' ? '리퍼 부품이 등록되었습니다.' : '리퍼 부품이 수정되었습니다.'
      )
      router.push('/admin/refurb')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* 섹션 1: 기본정보 */}
      <section className="flex flex-col gap-4 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">기본정보</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="RF-CPU-13600K-01" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">부품명 *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="인텔 코어 i5-13600K" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>부품 종류 *</Label>
            <Select value={partType} onValueChange={(v) => setPartType((v as PartType) ?? '')}>
              <SelectTrigger><SelectValue placeholder="부품 종류 선택" /></SelectTrigger>
              <SelectContent>
                {PART_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{partTypeLabel(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>등급 *</Label>
            <Select value={conditionGrade} onValueChange={(v) => { if (v) setConditionGrade(v as ConditionGrade) }}>
              <SelectTrigger><SelectValue placeholder="등급 선택" /></SelectTrigger>
              <SelectContent>
                {CONDITION_GRADES.map((grade) => {
                  const g = conditionGradeLabel(grade)
                  return (
                    <SelectItem key={grade} value={grade}>{g.label} — {g.desc}</SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="manufacturer">제조사</Label>
          <Input
            id="manufacturer"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="예: Intel / NVIDIA / 삼성전자"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="spec_summary">한줄 사양</Label>
          <Input
            id="spec_summary"
            value={specSummary}
            onChange={(e) => setSpecSummary(e.target.value)}
            placeholder="예: 8코어 16스레드 / 3.8GHz / 소켓 LGA1700"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">상세 설명</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="부품에 대한 설명 (선택)"
            rows={3}
          />
        </div>
      </section>

      {/* 섹션 2: 판매·재고 */}
      <section className="flex flex-col gap-4 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">판매·재고</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="market_price">신품 시세 (원)</Label>
            <Input
              id="market_price"
              value={displayMarketPrice}
              onChange={(e) => handleMarketPriceChange(e.target.value)}
              placeholder="450,000"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sale_price">판매가 (원) *</Label>
            <Input
              id="sale_price"
              value={displaySalePrice}
              onChange={(e) => handleSalePriceChange(e.target.value)}
              placeholder="290,000"
            />
            {rate !== null && (
              <p className="text-xs text-blue-600">신품 시세 대비 {rate}% 할인</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="stock_quantity">재고 수량 *</Label>
            <Input
              id="stock_quantity"
              type="number"
              min={0}
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="warranty_months">보증 기간 (개월)</Label>
            <Input
              id="warranty_months"
              type="number"
              min={0}
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>활성 여부</Label>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm text-zinc-500">{isActive ? '활성' : '비활성'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 섹션 3: 이미지 */}
      <section className="flex flex-col gap-6 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">이미지</h2>
        <ThumbnailUploader
          value={thumbnailUrls}
          pendingFiles={thumbnailFiles}
          onChange={handleThumbnailChange}
        />
        <hr />
        <DetailImageUploader
          value={detailUrl}
          pendingFile={detailFile}
          onChange={handleDetailChange}
        />
      </section>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/refurb')} disabled={saving}>
          취소
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? '저장 중...' : mode === 'create' ? '등록' : '수정'}
        </Button>
      </div>
    </form>
  )
}
