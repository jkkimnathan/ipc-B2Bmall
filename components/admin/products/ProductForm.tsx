'use client'

/**
 * 표준 PC 등록/수정 공용 폼 컴포넌트
 * 탭 3개: 기본 정보, 사양, 이미지
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
import { SelectGroup, SelectLabel } from '@/components/ui/select'

import SpecForm from './SpecForm'
import ThumbnailUploader from './ThumbnailUploader'
import DetailImageUploader from './DetailImageUploader'
import { createProduct, updateProduct } from '@/app/(admin)/admin/(dashboard)/products/actions'

import type { StandardPc, StandardPcSpec } from '@/types/database'
import { createEmptySpec } from '@/types/database'

interface ProductFormProps {
  mode: 'create' | 'edit'
  initialData?: StandardPc
}

export default function ProductForm({ mode, initialData }: ProductFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'spec' | 'images'>('basic')

  // 기본 정보 상태
  const [sku, setSku] = useState(initialData?.sku ?? '')
  const [name, setName] = useState(initialData?.name ?? '')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [salePrice, setSalePrice] = useState(initialData?.sale_price?.toString() ?? '')
  const [stockStatus, setStockStatus] = useState(initialData?.stock_status ?? 'in_stock')
  const [leadTimeDays, setLeadTimeDays] = useState(initialData?.lead_time_days?.toString() ?? '5')
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)
  const [description, setDescription] = useState(initialData?.description ?? '')

  // 사양 상태
  const [spec, setSpec] = useState<StandardPcSpec>(initialData?.spec_json ?? createEmptySpec())

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

  // 단가 입력 핸들러 (숫자만 허용, 천단위 콤마 표시)
  const handlePriceChange = (val: string) => {
    const num = val.replace(/[^0-9]/g, '')
    setSalePrice(num)
  }

  const displayPrice = salePrice
    ? Number(salePrice).toLocaleString('ko-KR')
    : ''

  // 검증
  const validate = (): string | null => {
    if (!sku.trim()) { setActiveTab('basic'); return 'SKU를 입력해주세요.' }
    if (!name.trim()) { setActiveTab('basic'); return 'PC명을 입력해주세요.' }
    if (!category) { setActiveTab('basic'); return '카테고리를 선택해주세요.' }
    if (!salePrice || Number(salePrice) <= 0) { setActiveTab('basic'); return '단가를 입력해주세요.' }
    if (thumbnailUrls.length + thumbnailFiles.length === 0) {
      setActiveTab('images')
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
      formData.set('category', category)
      formData.set('description', description)
      formData.set('spec_json', JSON.stringify(spec))
      formData.set('thumbnail_urls', JSON.stringify(uploadedThumbUrls))
      formData.set('detail_image_url', finalDetailUrl ?? '')
      formData.set('sale_price', salePrice)
      formData.set('stock_status', stockStatus)
      formData.set('lead_time_days', leadTimeDays || '5')
      formData.set('is_active', String(isActive))

      // 수정 모드: 삭제된 이미지 정보 포함
      if (mode === 'edit') {
        formData.set('removed_thumbnails', JSON.stringify(removedThumbnails))
        formData.set('removed_detail', removedDetail ?? '')
      }

      // 4. 서버 액션 호출
      const result = mode === 'create'
        ? await createProduct(formData)
        : await updateProduct(initialData!.id, formData)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(
        mode === 'create' ? '표준 PC가 등록되었습니다.' : '표준 PC가 수정되었습니다.'
      )
      router.push('/admin/products')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 탭 버튼 스타일
  const tabClass = (tab: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === tab
        ? 'bg-zinc-900 text-white'
        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
    }`

  return (
    <form onSubmit={handleSubmit}>
      {/* 수동 탭 바 */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        <button type="button" className={tabClass('basic')} onClick={() => setActiveTab('basic')}>
          기본 정보
        </button>
        <button type="button" className={tabClass('spec')} onClick={() => setActiveTab('spec')}>
          사양
        </button>
        <button type="button" className={tabClass('images')} onClick={() => setActiveTab('images')}>
          이미지
        </button>
      </div>

      {/* 탭 1: 기본 정보 */}
      {activeTab === 'basic' && (
        <div className="flex flex-col gap-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="iPC-B-ENTRY-01" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">PC명 *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="iPC Business Entry i5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>카테고리 *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="카테고리 선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">iPC Business</SelectItem>
                  <SelectItem value="pro">iPC Pro</SelectItem>
                  <SelectItem value="master">iPC Master</SelectItem>
                  <SelectItem value="aipc">iPC AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sale_price">단가 (원) *</Label>
              <Input
                id="sale_price"
                value={displayPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="850,000"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label>재고 상태</Label>
              <Select value={stockStatus} onValueChange={(v) => { if (v) setStockStatus(v as typeof stockStatus) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">재고 충분</SelectItem>
                  <SelectItem value="low_stock">재고 부족</SelectItem>
                  <SelectItem value="out_of_stock">재고 없음</SelectItem>
                  <SelectItem value="made_to_order">주문 제작</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead_time">표준 납기 (영업일)</Label>
              <Input
                id="lead_time"
                type="number"
                min={0}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">간단 설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="제품에 대한 간단한 설명 (선택)"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* 탭 2: 사양 */}
      {activeTab === 'spec' && (
        <div className="pt-4">
          <SpecForm value={spec} onChange={setSpec} />
        </div>
      )}

      {/* 탭 3: 이미지 */}
      {activeTab === 'images' && (
        <div className="flex flex-col gap-6 pt-4">
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
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/products')} disabled={saving}>
          취소
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? '저장 중...' : mode === 'create' ? '등록' : '수정'}
        </Button>
      </div>
    </form>
  )
}
