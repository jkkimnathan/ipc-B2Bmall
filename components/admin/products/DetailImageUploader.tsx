'use client'

/**
 * 상세 이미지 업로더 (1장)
 * 긴 세로 이미지를 업로드하며, 드래그앤드롭도 지원한다.
 */
import { useRef, useState, useMemo, useEffect } from 'react'
import { X, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface DetailImageUploaderProps {
  value: string | null       // 기존 URL
  pendingFile: File | null   // 새로 선택된 파일
  onChange: (url: string | null, file: File | null) => void
}

export default function DetailImageUploader({
  value,
  pendingFile,
  onChange,
}: DetailImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const hasImage = !!value || !!pendingFile

  const validateAndSet = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('지원하지 않는 형식입니다. (JPG, PNG, WebP만 가능)')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('10MB를 초과하는 파일입니다.')
      return
    }
    // 새 파일 설정 (기존 URL은 제거 예정으로 표시)
    onChange(null, file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSet(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSet(file)
  }

  const handleRemove = () => {
    onChange(null, null)
  }

  // 새 파일 미리보기 URL을 파일 변경 시에만 생성 (렌더마다 재생성 방지)
  const pendingUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  )
  // 파일 변경/언마운트 시 이전 blob URL 해제 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      if (pendingUrl) URL.revokeObjectURL(pendingUrl)
    }
  }, [pendingUrl])

  // 미리보기 소스
  const previewSrc = pendingUrl ?? value

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-700">상세 이미지 (1장, 선택)</p>

      {hasImage && previewSrc ? (
        <div className="relative">
          <img
            src={previewSrc}
            alt="상세 이미지"
            className="max-h-[600px] w-full rounded-lg border object-contain"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              변경
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="size-3" />
              삭제
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-zinc-300 hover:border-zinc-400'
          }`}
        >
          <ImagePlus className="size-8 text-zinc-400" />
          <p className="text-sm text-zinc-500">클릭 또는 드래그하여 상세 이미지 업로드</p>
          <p className="text-xs text-zinc-400">JPG, PNG, WebP / 최대 10MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
