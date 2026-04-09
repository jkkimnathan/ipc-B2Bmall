'use client'

/**
 * PC 사양 입력 폼 컴포넌트
 * 11개 고정 슬롯(CPU, MB, GPU 등)과 가변 ETC 섹션을 관리한다.
 */
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { partLabel } from '@/lib/utils/format'
import { Plus, X } from 'lucide-react'
import type { StandardPcSpec, PartSlot, EtcSlot } from '@/types/database'

// 고정 슬롯 키 목록 (순서대로 표시)
const FIXED_KEYS = ['cpu', 'mb', 'gpu', 'cooler', 'ram', 'ssd', 'hdd', 'case', 'psu', 'os', 'as'] as const

interface SpecFormProps {
  value: StandardPcSpec
  onChange: (next: StandardPcSpec) => void
}

export default function SpecForm({ value, onChange }: SpecFormProps) {
  // 고정 슬롯 변경 핸들러
  const handleSlotChange = (key: string, field: keyof PartSlot, val: string | number) => {
    const slot = { ...(value[key as keyof StandardPcSpec] as PartSlot) }
    if (field === 'qty') {
      slot.qty = Math.max(0, Math.floor(Number(val) || 0))
    } else {
      slot.name = val as string
    }
    onChange({ ...value, [key]: slot })
  }

  // ETC 슬롯 변경
  const handleEtcChange = (index: number, field: keyof EtcSlot, val: string | number) => {
    const etc = [...value.etc]
    const item = { ...etc[index] }
    if (field === 'qty') {
      item.qty = Math.max(0, Math.floor(Number(val) || 0))
    } else {
      (item[field] as string) = val as string
    }
    etc[index] = item
    onChange({ ...value, etc })
  }

  // ETC 항목 추가
  const addEtc = () => {
    onChange({ ...value, etc: [...value.etc, { label: '', name: '', qty: 1 }] })
  }

  // ETC 항목 삭제
  const removeEtc = (index: number) => {
    onChange({ ...value, etc: value.etc.filter((_, i) => i !== index) })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 고정 슬롯 11개 */}
      <div className="flex flex-col gap-2">
        {FIXED_KEYS.map((key) => {
          const slot = value[key] as PartSlot
          const isEmpty = slot.qty === 0
          return (
            <div
              key={key}
              className={`flex items-center gap-2 ${isEmpty ? 'opacity-50' : ''}`}
            >
              <span className="w-[80px] shrink-0 text-sm font-medium text-zinc-700">
                {partLabel(key)}
              </span>
              <Input
                placeholder="부품명"
                value={slot.name}
                onChange={(e) => handleSlotChange(key, 'name', e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                value={slot.qty}
                onChange={(e) => handleSlotChange(key, 'qty', e.target.value)}
                className="w-[60px]"
              />
            </div>
          )
        })}
      </div>

      {/* ETC 가변 섹션 */}
      <div className="flex flex-col gap-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-700">추가 항목 (ETC)</span>
          <Button type="button" variant="outline" size="sm" onClick={addEtc}>
            <Plus className="size-3" />
            항목 추가
          </Button>
        </div>

        {value.etc.length === 0 && (
          <p className="text-xs text-zinc-400">추가 항목이 없습니다.</p>
        )}

        {value.etc.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="라벨"
              value={item.label}
              onChange={(e) => handleEtcChange(i, 'label', e.target.value)}
              className="w-[120px]"
            />
            <Input
              placeholder="부품명"
              value={item.name}
              onChange={(e) => handleEtcChange(i, 'name', e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              value={item.qty}
              onChange={(e) => handleEtcChange(i, 'qty', e.target.value)}
              className="w-[60px]"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeEtc(i)}
              className="text-zinc-400 hover:text-red-500"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
