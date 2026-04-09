'use client'

/**
 * 사업자등록증 카드 (다운로드 + 재업로드)
 */
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateBusinessCert } from '@/app/(dealer)/dealer/(protected)/mypage/actions'

interface Props {
  certUrl: string | null
}

export default function BusinessCertCard({ certUrl }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.set('file', file)
      await updateBusinessCert(formData)
      toast.success('사업자등록증이 업데이트되었습니다.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">사업자등록증</CardTitle>
        <div>
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleUpload} />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="size-4" />
            {uploading ? '업로드 중...' : '재업로드'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {certUrl ? (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="size-4 text-zinc-400" />
            <span className="text-zinc-600">파일 등록됨</span>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">미등록</p>
        )}
      </CardContent>
    </Card>
  )
}
