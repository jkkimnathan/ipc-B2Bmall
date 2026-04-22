'use client'

/**
 * 썸네일 이미지 업로더 (1~3장)
 * 기존 URL과 새로 선택된 파일을 함께 관리한다.
 * 첫 번째 슬롯에 "대표" 라벨을 표시한다.
 */
import { useRef } from 'react'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface ThumbnailUploaderProps {
  value: string[]        // 기존 업로드된 URL
  pendingFiles: File[]   // 새로 선택된 파일
  onChange: (urls: string[], files: File[]) => void
  max?: number
}

export default function ThumbnailUploader({
  value,
  pendingFiles,
  onChange,
  max = 3,
}: ThumbnailUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const totalCount = value.length + pendingFiles.length

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = max - totalCount
    if (remaining <= 0) {
      toast.error(`최대 ${max}장까지 업로드할 수 있습니다.`)
      return
    }

    const valid: File[] = []
    for (const file of files.slice(0, remaining)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`지원하지 않는 형식입니다: ${file.name}`)
        continue
      }
      if (file.size > MAX_SIZE) {
        toast.error(`5MB를 초과합니다: ${file.name}`)
        continue
      }
      valid.push(file)
    }

    if (valid.length > 0) {
      onChange(value, [...pendingFiles, ...valid])
    }
    // input 리셋 (같은 파일 재선택 가능)
    e.target.value = ''
  }

  // 기존 URL 삭제
  const removeUrl = (index: number) => {
    onChange(value.filter((_, i) => i !== index), pendingFiles)
  }

  // 새 파일 삭제
  const removeFile = (index: number) => {
    onChange(value, pendingFiles.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-700">썸네일 이미지 (최대 {max}장)</p>
      <div className="flex gap-3">
        {/* 기존 URL 이미지 */}
        {value.map((url, i) => (
          <div key={`url-${i}`} className="relative">
            <img
              src={url}
              alt={`썸네일 ${i + 1}`}
              className="size-[120px] rounded-lg border bg-zinc-50 object-contain p-2"
            />
            {i === 0 && totalCount > 0 && (
              <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                대표
              </span>
            )}
            <button
              type="button"
              onClick={() => removeUrl(i)}
              className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {/* 새 파일 미리보기 */}
        {pendingFiles.map((file, i) => (
          <div key={`file-${i}`} className="relative">
            <img
              src={URL.createObjectURL(file)}
              alt={`새 이미지 ${i + 1}`}
              className="size-[120px] rounded-lg border bg-zinc-50 object-contain p-2"
            />
            {value.length === 0 && i === 0 && (
              <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                대표
              </span>
            )}
            <button
              type="button"
              onClick={() => removeFile(i)}
              className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {/* 추가 버튼 */}
        {totalCount < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-[120px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-500"
          >
            <Plus className="size-6" />
            <span className="text-xs">추가</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
