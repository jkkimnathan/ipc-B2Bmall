'use client'

/**
 * 거래처 담당자 목록 + 액션 컴포넌트
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Star, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import AddDealerUserDialog from './AddDealerUserDialog'
import CredentialDialog from './CredentialDialog'
import {
  resetDealerUserPassword, setDealerUserActive,
  deleteDealerUser, setPrimaryDealerUser,
} from '@/app/(admin)/admin/(dashboard)/dealers/actions'
import type { DealerUser } from '@/types/database'

interface Props {
  dealerId: string
  users: DealerUser[]
}

export default function DealerUserList({ dealerId, users }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [cred, setCred] = useState({ open: false, loginId: '', tempPassword: '' })

  const handleResetPassword = async (userId: string) => {
    try {
      const result = await resetDealerUserPassword(userId)
      const user = users.find((u) => u.id === userId)
      setCred({ open: true, loginId: user?.login_id ?? '', tempPassword: result.tempPassword })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '비밀번호 재설정 실패')
    }
  }

  const handleSetPrimary = async (userId: string) => {
    try {
      await setPrimaryDealerUser(userId)
      toast.success('대표 담당자가 변경되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '변경 실패')
    }
  }

  const handleToggleActive = async (userId: string, current: boolean) => {
    try {
      await setDealerUserActive(userId, !current)
      toast.success(!current ? '활성화되었습니다.' : '비활성화되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '변경 실패')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('이 담당자를 삭제하시겠습니까? Auth 계정도 함께 삭제됩니다.')) return
    try {
      await deleteDealerUser(userId)
      toast.success('삭제되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">담당자 목록</h3>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="size-4" />
          담당자 추가
        </Button>
      </div>

      {users.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일/로그인ID</TableHead>
                <TableHead>직책</TableHead>
                <TableHead className="text-center">대표</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-sm">{user.login_id}</TableCell>
                  <TableCell>{user.role ?? '—'}</TableCell>
                  <TableCell className="text-center">
                    {user.is_primary && <Star className="inline size-4 text-yellow-500 fill-yellow-500" />}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                          비밀번호 재설정
                        </DropdownMenuItem>
                        {!user.is_primary && (
                          <DropdownMenuItem onClick={() => handleSetPrimary(user.id)}>
                            대표 담당자로 지정
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleToggleActive(user.id, user.is_active)}>
                          {user.is_active ? '비활성화' : '활성화'}
                        </DropdownMenuItem>
                        {!user.is_primary && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            삭제
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-zinc-400 py-8 text-center">등록된 담당자가 없습니다.</p>
      )}

      {/* 담당자 추가 다이얼로그 */}
      <AddDealerUserDialog
        open={showAdd}
        dealerId={dealerId}
        onClose={() => setShowAdd(false)}
        onSuccess={(loginId, tempPassword) => {
          setShowAdd(false)
          setCred({ open: true, loginId, tempPassword })
        }}
      />

      {/* 임시 비번 다이얼로그 */}
      <CredentialDialog
        open={cred.open}
        loginId={cred.loginId}
        tempPassword={cred.tempPassword}
        onClose={() => setCred({ open: false, loginId: '', tempPassword: '' })}
      />
    </>
  )
}
