'use client'

/**
 * 거래처 연락처/주소 수정 폼
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateMyDealer } from '@/app/(dealer)/dealer/(protected)/mypage/actions'

interface Props {
  phone: string | null
  postalCode: string | null
  address: string | null
}

export default function CompanyInfoForm({ phone, postalCode, address }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    phone: phone ?? '',
    postalCode: postalCode ?? '',
    address: address ?? '',
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.set('phone', form.phone)
      formData.set('postal_code', form.postalCode)
      formData.set('address', form.address)
      await updateMyDealer(formData)
      toast.success('수정되었습니다.')
      setEditing(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '수정 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">연락처 / 주소</CardTitle>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            수정
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <div className="flex flex-col gap-2">
              <Label>대표 전화</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label>우편번호</Label>
                <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <Label>주소</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>취소</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
            </div>
          </>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">대표 전화</span>
              <span className="font-medium text-zinc-900">{phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">우편번호</span>
              <span className="font-medium text-zinc-900">{postalCode || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">주소</span>
              <span className="font-medium text-zinc-900">{address || '—'}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
