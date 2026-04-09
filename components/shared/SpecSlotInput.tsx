'use client'

/**
 * 범용 PC 사양 입력 컴포넌트
 *
 * mode에 따라 placeholder가 달라진다:
 * - request: 거래처가 요구사항 입력 ("i5급 이상" 등)
 * - proposal: 관리자가 견적 작성 ("Intel Core i5-14400F" 등)
 *
 * readOnly: 상세 페이지에서 읽기 전용 표시
 */
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { partLabel } from '@/lib/utils/format'
import { Plus, X } from 'lucide-react'
import type { StandardPcSpec, PartSlot, EtcSlot } from '@/types/database'

const FIXED_KEYS = ['cpu', 'mb', 'gpu', 'cooler', 'ram', 'ssd', 'hdd', 'case', 'psu', 'os', 'as'] as const

// mode별 placeholder
const REQUEST_PLACEHOLDERS: Record<string, string> = {
  cpu: '예) i5급 이상, 코어수 무관',
  mb: '예) B760 칩셋',
  gpu: '예) 내장 가능 / RTX 4060 이상',
  cooler: '예) 기본 쿨러 / 타워 쿨러',
  ram: '예) 32GB DDR5',
  ssd: '예) 1TB NVMe',
  hdd: '예) 필요 없음 / 2TB',
  case: '예) 미들타워',
  psu: '예) 600W 이상',
  os: '예) Windows 11 Pro',
  as: '예) 3년 이상',
}

const PROPOSAL_PLACEHOLDERS: Record<string, string> = {
  cpu: '예) Intel Core i5-14400F',
  mb: '예) ASUS PRIME B760M-A',
  gpu: '예) Intel UHD 730 (내장)',
  cooler: '예) 기본 쿨러',
  ram: '예) Samsung DDR5 32GB',
  ssd: '예) Samsung 990 EVO 1TB',
  hdd: '',
  case: '예) 3RSYS J700',
  psu: '예) 마이크로닉스 600W 80+',
  os: '예) Windows 11 Pro',
  as: '예) 3년 무상',
}

interface SpecSlotInputProps {
  value: StandardPcSpec
  onChange?: (next: StandardPcSpec) => void
  mode?: 'request' | 'proposal'
  disabled?: boolean
  readOnly?: boolean
}

export default function SpecSlotInput({
  value,
  onChange,
  mode = 'request',
  disabled = false,
  readOnly = false,
}: SpecSlotInputProps) {
  const placeholders = mode === 'request' ? REQUEST_PLACEHOLDERS : PROPOSAL_PLACEHOLDERS

  const handleSlotChange = (key: string, field: keyof PartSlot, val: string | number) => {
    const slot = { ...(value[key as keyof StandardPcSpec] as PartSlot) }
    if (field === 'qty') {
      slot.qty = Math.max(0, Math.floor(Number(val) || 0))
    } else {
      slot.name = val as string
    }
    onChange?.({ ...value, [key]: slot })
  }

  const handleEtcChange = (index: number, field: keyof EtcSlot, val: string | number) => {
    const etc = [...value.etc]
    const item = { ...etc[index] }
    if (field === 'qty') {
      item.qty = Math.max(0, Math.floor(Number(val) || 0))
    } else {
      (item[field] as string) = val as string
    }
    etc[index] = item
    onChange?.({ ...value, etc })
  }

  const addEtc = () => {
    onChange?.({ ...value, etc: [...value.etc, { label: '', name: '', qty: 1 }] })
  }

  const removeEtc = (index: number) => {
    onChange?.({ ...value, etc: value.etc.filter((_, i) => i !== index) })
  }

  // 읽기 전용: 값이 있는 슬롯만 표시
  if (readOnly) {
    const filledSlots = FIXED_KEYS.filter((key) => {
      const slot = value[key] as PartSlot
      return slot.name && slot.qty > 0
    })

    return (
      <div className="flex flex-col gap-2">
        {filledSlots.length === 0 && value.etc.length === 0 && (
          <p className="text-sm text-zinc-400">입력된 사양이 없습니다.</p>
        )}
        {filledSlots.map((key) => {
          const slot = value[key] as PartSlot
          return (
            <div key={key} className="flex items-center gap-2 py-1 border-b border-zinc-100 last:border-0">
              <span className="w-[80px] shrink-0 text-sm font-medium text-zinc-500">
                {partLabel(key)}
              </span>
              <span className="text-sm text-zinc-900">{slot.name}</span>
              {slot.qty > 1 && (
                <span className="text-xs text-zinc-400">x {slot.qty}</span>
              )}
            </div>
          )
        })}
        {value.etc.filter((e) => e.name).map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-1 border-b border-zinc-100 last:border-0">
            <span className="w-[80px] shrink-0 text-sm font-medium text-zinc-500">
              {item.label || 'ETC'}
            </span>
            <span className="text-sm text-zinc-900">{item.name}</span>
            {item.qty > 1 && (
              <span className="text-xs text-zinc-400">x {item.qty}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 고정 슬롯 11개 */}
      <div className="flex flex-col gap-2">
        {FIXED_KEYS.map((key) => {
          const slot = value[key] as PartSlot
          const isEmpty = slot.qty === 0 && !slot.name
          return (
            <div
              key={key}
              className={`flex items-center gap-2 ${isEmpty ? 'opacity-50' : ''}`}
            >
              <span className="w-[80px] shrink-0 text-sm font-medium text-zinc-700">
                {partLabel(key)}
              </span>
              <Input
                placeholder={placeholders[key] ?? '부품명'}
                value={slot.name}
                onChange={(e) => handleSlotChange(key, 'name', e.target.value)}
                className="flex-1"
                disabled={disabled}
              />
              <Input
                type="number"
                min={0}
                value={slot.qty}
                onChange={(e) => handleSlotChange(key, 'qty', e.target.value)}
                className="w-[60px]"
                disabled={disabled}
              />
            </div>
          )
        })}
      </div>

      {/* ETC 가변 섹션 */}
      <div className="flex flex-col gap-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-700">추가 항목 (ETC)</span>
          {!disabled && (
            <Button type="button" variant="outline" size="sm" onClick={addEtc}>
              <Plus className="size-3" /> 항목 추가
            </Button>
          )}
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
              disabled={disabled}
            />
            <Input
              placeholder="부품명"
              value={item.name}
              onChange={(e) => handleEtcChange(i, 'name', e.target.value)}
              className="flex-1"
              disabled={disabled}
            />
            <Input
              type="number"
              min={0}
              value={item.qty}
              onChange={(e) => handleEtcChange(i, 'qty', e.target.value)}
              className="w-[60px]"
              disabled={disabled}
            />
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEtc(i)}
                className="text-zinc-400 hover:text-red-500"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
