'use client'

/**
 * 리퍼 부품 목록의 행별 액션 컴포넌트
 * 활성 토글 Switch + ⋮ 드롭다운(수정/삭제) + 삭제 확인 다이얼로그
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { toggleRefurbActive, deleteRefurbPart } from '@/app/(admin)/admin/(dashboard)/refurb/actions'

interface RefurbRowActionsProps {
  id: string
  isActive: boolean
  name: string
}

export function RefurbActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, setPending] = useState(false)

  const handleToggle = async () => {
    setPending(true)
    try {
      const result = await toggleRefurbActive(id, isActive)
      if (result?.error) toast.error(result.error)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '변경 실패')
    } finally {
      setPending(false)
    }
  }

  return <Switch checked={isActive} onCheckedChange={handleToggle} disabled={pending} />
}

export function RefurbDropdownActions({ id, name }: RefurbRowActionsProps) {
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const result = await deleteRefurbPart(id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('삭제되었습니다.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/admin/refurb/${id}/edit`)}>
            <Pencil className="mr-2 size-4" />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDelete(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 size-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{name}&quot;과 모든 이미지(썸네일+상세)가 영구 삭제됩니다.
              이미 발주된 내역에는 영향을 주지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
