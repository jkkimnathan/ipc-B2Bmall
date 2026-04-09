'use client'

/**
 * 거래처 상세 페이지 클라이언트 부분
 * 탭 전환, 상태 액션, 승인/반려 다이얼로그를 처리한다.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Ban, CheckCircle, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import DealerUserList from './DealerUserList'
import CredentialDialog from './CredentialDialog'
import {
  approveDealer, rejectDealer, setDealerStatus,
  deleteDealer, updateDealerMemo,
} from '@/app/(admin)/admin/(dashboard)/dealers/actions'
import { formatBusinessNo, dealerStatusLabel, formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Dealer, DealerUser } from '@/types/database'

interface Props {
  dealer: Dealer
  users: DealerUser[]
  orderCount: number
  rfqCount: number
  certSignedUrl?: string | null
}

export default function DealerDetailClient({ dealer, users, orderCount, rfqCount, certSignedUrl }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('info')
  const [memo, setMemo] = useState(dealer.memo ?? '')
  const [savingMemo, setSavingMemo] = useState(false)

  // 다이얼로그 상태
  const [showApprove, setShowApprove] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [cred, setCred] = useState({ open: false, loginId: '', tempPassword: '' })
  const [processing, setProcessing] = useState(false)

  const st = dealerStatusLabel(dealer.status)
  const badgeVariant = st.color === 'green' ? 'default' as const : st.color === 'red' ? 'destructive' as const : 'secondary' as const

  // 승인 처리
  const handleApprove = async () => {
    setProcessing(true)
    try {
      const result = await approveDealer(dealer.id)
      setShowApprove(false)
      setCred({ open: true, loginId: result.loginId, tempPassword: result.tempPassword })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '승인 실패')
    } finally {
      setProcessing(false)
    }
  }

  // 반려 처리
  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('반려 사유를 입력해주세요.'); return }
    setProcessing(true)
    try {
      await rejectDealer(dealer.id, rejectReason)
      toast.success('반려 처리되었습니다.')
      setShowReject(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '반려 실패')
    } finally {
      setProcessing(false)
    }
  }

  // 정지/활성화 토글
  const handleToggleStatus = async () => {
    const newStatus = dealer.status === 'active' ? 'suspended' : 'active'
    try {
      await setDealerStatus(dealer.id, newStatus)
      toast.success(newStatus === 'active' ? '활성화되었습니다.' : '정지 처리되었습니다.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '상태 변경 실패')
    }
  }

  // 삭제
  const handleDelete = async () => {
    setProcessing(true)
    try {
      await deleteDealer(dealer.id)
      toast.success('삭제되었습니다.')
      router.push('/admin/dealers')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setProcessing(false)
      setShowDelete(false)
    }
  }

  // 메모 저장
  const handleSaveMemo = async () => {
    setSavingMemo(true)
    try {
      await updateDealerMemo(dealer.id, memo)
      toast.success('메모가 저장되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSavingMemo(false)
    }
  }

  const tabs = [
    { value: 'info', label: '기본정보' },
    { value: 'users', label: '담당자' },
    { value: 'orders', label: '거래내역' },
    { value: 'memo', label: '메모' },
  ]

  const tabClass = (tab: string) =>
    cn('px-4 py-2 text-sm font-medium rounded-md transition-colors',
      activeTab === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900')

  return (
    <>
      {/* 상단 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{dealer.company_name}</h1>
            <Badge variant={badgeVariant}>{st.label}</Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            사업자번호: {formatBusinessNo(dealer.business_no)}
            {dealer.created_at && ` · 등록일: ${formatDate(dealer.created_at)}`}
          </p>
          {dealer.rejection_reason && (
            <p className="text-sm text-red-500 mt-1">반려 사유: {dealer.rejection_reason}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            <MoreHorizontal className="size-4" />
            작업
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {dealer.status === 'pending' && (
              <>
                <DropdownMenuItem onClick={() => setShowApprove(true)}>
                  <CheckCircle className="mr-2 size-4 text-green-600" />승인
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowReject(true)}>
                  <Ban className="mr-2 size-4 text-red-600" />반려
                </DropdownMenuItem>
              </>
            )}
            {dealer.status !== 'pending' && (
              <DropdownMenuItem onClick={() => router.push(`/admin/dealers/${dealer.id}/edit`)}>
                <Pencil className="mr-2 size-4" />정보 수정
              </DropdownMenuItem>
            )}
            {dealer.status === 'active' && (
              <DropdownMenuItem onClick={handleToggleStatus}>
                <Ban className="mr-2 size-4 text-red-600" />정지
              </DropdownMenuItem>
            )}
            {dealer.status === 'suspended' && (
              <DropdownMenuItem onClick={handleToggleStatus}>
                <CheckCircle className="mr-2 size-4 text-green-600" />활성화
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 size-4" />삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 탭 바 */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {tabs.map((tab) => (
          <button key={tab.value} className={tabClass(tab.value)} onClick={() => setActiveTab(tab.value)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 1: 기본정보 */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">사업자 정보</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="상호" value={dealer.company_name} />
              <Row label="사업자번호" value={formatBusinessNo(dealer.business_no)} />
              <Row label="대표자" value={dealer.ceo_name} />
              <Row label="업태" value={dealer.business_type} />
              <Row label="종목" value={dealer.business_item} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">연락처/주소</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="대표 전화" value={dealer.phone} />
              <Row label="이메일" value={dealer.email} />
              <Row label="우편번호" value={dealer.postal_code} />
              <Row label="주소" value={dealer.address} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">사업자등록증</CardTitle></CardHeader>
            <CardContent>
              {dealer.business_cert_url ? (
                certSignedUrl ? (
                  <a href={certSignedUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                    다운로드
                  </a>
                ) : (
                  <p className="text-sm text-zinc-400">파일 있음 (URL 생성 실패)</p>
                )
              ) : (
                <p className="text-sm text-zinc-400">미등록</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">통계</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="담당자 수" value={String(users.length)} />
              <Row label="발주 건수" value={String(orderCount)} />
              <Row label="견적요청 건수" value={String(rfqCount)} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 탭 2: 담당자 */}
      {activeTab === 'users' && (
        <DealerUserList dealerId={dealer.id} users={users} />
      )}

      {/* 탭 3: 거래내역 */}
      {activeTab === 'orders' && (
        <div className="text-center py-12 text-sm text-zinc-400">
          거래내역이 없습니다.
        </div>
      )}

      {/* 탭 4: 메모 */}
      {activeTab === 'memo' && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">관리자 내부 메모입니다. 거래처에는 노출되지 않습니다.</p>
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={6} />
          <div className="flex justify-end">
            <Button onClick={handleSaveMemo} disabled={savingMemo}>
              {savingMemo ? '저장 중...' : '메모 저장'}
            </Button>
          </div>
        </div>
      )}

      {/* ===== 다이얼로그들 ===== */}

      {/* 승인 다이얼로그 */}
      <AlertDialog open={showApprove} onOpenChange={setShowApprove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>거래처를 승인하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              승인 시 첫 담당자 계정이 자동 발급됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={processing}>
              {processing ? '처리 중...' : '승인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 반려 다이얼로그 */}
      <AlertDialog open={showReject} onOpenChange={setShowReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가입신청을 반려하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>반려 사유를 입력해주세요.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="반려 사유 입력"
            className="my-2"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={processing} className="bg-red-600 hover:bg-red-700">
              {processing ? '처리 중...' : '반려'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 삭제 다이얼로그 */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 거래처와 모든 담당자 계정이 삭제됩니다. 거래 이력이 있으면 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={processing} className="bg-red-600 hover:bg-red-700">
              {processing ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 임시 비번 다이얼로그 (승인 후) */}
      <CredentialDialog
        open={cred.open}
        loginId={cred.loginId}
        tempPassword={cred.tempPassword}
        onClose={() => { setCred({ open: false, loginId: '', tempPassword: '' }); router.refresh() }}
      />
    </>
  )
}

/** 기본정보 행 표시 헬퍼 */
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value || '—'}</span>
    </div>
  )
}
