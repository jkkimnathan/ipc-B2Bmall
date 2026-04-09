'use client'

/**
 * 배송지 주소록 관리 클라이언트 컴포넌트
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Star, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import {
  createAddress, updateAddress, deleteAddress, setDefaultAddress,
} from '@/app/(dealer)/dealer/(protected)/mypage/addresses/actions'
import { formatAddress } from '@/lib/utils/format'
import type { DealerAddress } from '@/types/database'

interface Props {
  addresses: DealerAddress[]
}

// 폼 초기값
const emptyForm = {
  label: '', recipient_name: '', phone: '',
  postal_code: '', address: '', address_detail: '',
  memo: '', is_default: false,
}

export default function AddressListClient({ addresses }: Props) {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const openAdd = () => {
    setEditId(null)
    setForm(emptyForm)
    setShowDialog(true)
  }

  const openEdit = (addr: DealerAddress) => {
    setEditId(addr.id)
    setForm({
      label: addr.label,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      postal_code: addr.postal_code ?? '',
      address: addr.address,
      address_detail: addr.address_detail ?? '',
      memo: addr.memo ?? '',
      is_default: addr.is_default,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.label.trim()) { toast.error('라벨을 입력해주세요.'); return }
    if (!form.recipient_name.trim()) { toast.error('받는 사람을 입력해주세요.'); return }
    if (!form.phone.trim()) { toast.error('연락처를 입력해주세요.'); return }
    if (!form.address.trim()) { toast.error('주소를 입력해주세요.'); return }

    setSaving(true)
    try {
      const fd = new FormData()
      fd.set('label', form.label)
      fd.set('recipient_name', form.recipient_name)
      fd.set('phone', form.phone)
      fd.set('postal_code', form.postal_code)
      fd.set('address', form.address)
      fd.set('address_detail', form.address_detail)
      fd.set('memo', form.memo)
      fd.set('is_default', String(form.is_default))

      if (editId) {
        await updateAddress(editId, fd)
        toast.success('수정되었습니다.')
      } else {
        await createAddress(fd)
        toast.success('등록되었습니다.')
      }
      setShowDialog(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 배송지를 삭제하시겠습니까?')) return
    try {
      await deleteAddress(id)
      toast.success('삭제되었습니다.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id)
      toast.success('기본 배송지로 설정되었습니다.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '설정 실패')
    }
  }

  const set = (key: string, val: string | boolean) => setForm((p) => ({ ...p, [key]: val }))

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">배송지 목록</h3>
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" /> 주소 추가
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-12 text-sm text-zinc-400">
          <MapPin className="size-10 mx-auto mb-3 text-zinc-300" />
          <p>등록된 배송지가 없습니다.</p>
          <p className="mt-1">기본 배송지를 지정해두면 발주 시 자동 선택됩니다.</p>
          <Button size="sm" className="mt-4" onClick={openAdd}>
            <Plus className="size-4" /> 주소 추가
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <Card key={addr.id} className={addr.is_default ? 'border-yellow-300 bg-yellow-50/50' : ''}>
              <CardContent className="flex items-start justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {addr.is_default && (
                      <span className="flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded px-1.5 py-0.5">
                        <Star className="size-3 fill-yellow-500 text-yellow-500" /> 기본
                      </span>
                    )}
                    <span className="font-medium text-zinc-900">{addr.label}</span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    {addr.recipient_name} / {addr.phone}
                  </p>
                  <p className="text-sm text-zinc-500">{formatAddress(addr)}</p>
                  {addr.memo && (
                    <p className="text-xs text-zinc-400">메모: {addr.memo}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {!addr.is_default && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(addr.id)}>
                      <Star className="size-4" /> 기본설정
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(addr)}>수정</Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(addr.id)}>삭제</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 주소 추가/수정 다이얼로그 */}
      <AlertDialog open={showDialog} onOpenChange={(v) => { if (!v) setShowDialog(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editId ? '배송지 수정' : '배송지 추가'}</AlertDialogTitle>
            <AlertDialogDescription>
              발주 시 사용할 배송지를 등록합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex flex-col gap-2">
              <Label>라벨 *</Label>
              <Input value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="본사, 부산물류센터 등" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>받는 사람 *</Label>
                <Input value={form.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} placeholder="홍길동" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>연락처 *</Label>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="010-1234-5678" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label>우편번호</Label>
                <Input value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} placeholder="06000" />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <Label>주소 *</Label>
                <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="서울 강남구 테헤란로 123" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>상세주소</Label>
              <Input value={form.address_detail} onChange={(e) => set('address_detail', e.target.value)} placeholder="4층 405호" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>배송 메모</Label>
              <Input value={form.memo} onChange={(e) => set('memo', e.target.value)} placeholder="경비실 경유, 10시 이후 수령" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={form.is_default} onCheckedChange={(v) => set('is_default', v === true)} />
              <span className="text-sm">기본 배송지로 설정</span>
            </label>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
