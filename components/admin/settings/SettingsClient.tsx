'use client'

/**
 * 관리자 설정 클라이언트 컴포넌트
 * 탭: 일반 설정 | 이메일 토글 | 발송 로그
 */
import { useState, useTransition } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { updateNotificationSettings, sendTestEmail } from '@/app/(admin)/admin/(dashboard)/settings/actions'
import type { EmailLog, NotificationSettings } from '@/types/database'

interface Props {
  settings: NotificationSettings
  logs: EmailLog[]
}

const TEMPLATE_LABELS: Record<string, { label: string; description: string }> = {
  dealer_order_approved: { label: '발주 승인', description: '거래처에게 발주 승인 알림' },
  dealer_order_rejected: { label: '발주 반려', description: '거래처에게 발주 반려 알림' },
  dealer_order_shipped: { label: '출고 완료', description: '거래처에게 출고 완료 알림' },
  dealer_quote_sent: { label: '견적서 발송', description: '거래처에게 견적서 발송 알림' },
  dealer_dealer_approved: { label: '가입 승인', description: '거래처에게 가입 승인 + 계정 정보' },
  admin_new_order: { label: '새 발주 접수', description: '관리자에게 새 발주 알림' },
  admin_new_rfq: { label: '새 견적요청', description: '관리자에게 새 견적요청 알림' },
}

const TEMPLATE_KEYS = Object.keys(TEMPLATE_LABELS)

function statusBadge(status: string) {
  switch (status) {
    case 'sent':
      return <Badge className="bg-green-100 text-green-800">발송</Badge>
    case 'failed':
      return <Badge variant="destructive">실패</Badge>
    case 'skipped':
      return <Badge variant="secondary">스킵</Badge>
    case 'pending':
      return <Badge variant="outline">대기</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function SettingsClient({ settings, logs }: Props) {
  const [isPending, startTransition] = useTransition()
  const [testEmailAddr, setTestEmailAddr] = useState('')

  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const key of TEMPLATE_KEYS) {
      init[key] = (settings as unknown as Record<string, unknown>)[key] as boolean ?? true
    }
    return init
  })

  function handleSaveSettings(formData: FormData) {
    for (const key of TEMPLATE_KEYS) {
      if (toggles[key]) {
        formData.set(key, 'on')
      } else {
        formData.delete(key)
      }
    }

    startTransition(async () => {
      try {
        await updateNotificationSettings(formData)
        toast.success('설정이 저장되었습니다.')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '저장 실패')
      }
    })
  }

  function handleSendTestEmail() {
    startTransition(async () => {
      try {
        const result = await sendTestEmail(testEmailAddr)
        if (result.success) {
          toast.success('테스트 이메일이 발송되었습니다.')
        } else {
          toast.error(result.error || '발송 실패')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '발송 실패')
      }
    })
  }

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">일반 설정</TabsTrigger>
        <TabsTrigger value="toggles">이메일 토글</TabsTrigger>
        <TabsTrigger value="logs">발송 로그</TabsTrigger>
      </TabsList>

      {/* 일반 설정 */}
      <TabsContent value="general">
        <Card className="p-6">
          <form action={handleSaveSettings} className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold">발신자 정보</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sender_name">발신자 이름</Label>
                  <Input
                    id="sender_name"
                    name="sender_name"
                    defaultValue={settings.sender_name}
                    placeholder="iPC Mall"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender_email">발신자 이메일</Label>
                  <Input
                    id="sender_email"
                    name="sender_email"
                    type="email"
                    defaultValue={settings.sender_email}
                    placeholder="noreply@intechonline.kr"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold">관리자 알림 수신</h3>
              <div className="space-y-2">
                <Label htmlFor="admin_notification_emails">
                  관리자 알림 이메일 (콤마로 구분)
                </Label>
                <Input
                  id="admin_notification_emails"
                  name="admin_notification_emails"
                  defaultValue={settings.admin_notification_emails ?? ''}
                  placeholder="admin1@example.com, admin2@example.com"
                />
                <p className="text-xs text-zinc-500">
                  비워두면 환경변수 ADMIN_NOTIFICATION_EMAILS 값이 사용됩니다.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? '저장 중...' : '설정 저장'}
            </Button>
          </form>
        </Card>

        {/* 테스트 이메일 */}
        <Card className="mt-4 p-6">
          <h3 className="mb-4 text-lg font-semibold">테스트 이메일 발송</h3>
          <div className="flex gap-3">
            <Input
              type="email"
              value={testEmailAddr}
              onChange={(e) => setTestEmailAddr(e.target.value)}
              placeholder="수신 이메일 주소"
              className="max-w-sm"
            />
            <Button
              onClick={handleSendTestEmail}
              disabled={isPending || !testEmailAddr.trim()}
              variant="outline"
            >
              {isPending ? '발송 중...' : '테스트 발송'}
            </Button>
          </div>
        </Card>
      </TabsContent>

      {/* 이메일 토글 */}
      <TabsContent value="toggles">
        <Card className="p-6">
          <form action={handleSaveSettings}>
            <h3 className="mb-4 text-lg font-semibold">알림 템플릿 활성화/비활성화</h3>
            <p className="mb-6 text-sm text-zinc-500">
              비활성화된 템플릿은 이메일이 발송되지 않으며 로그에 &quot;스킵&quot;으로 기록됩니다.
            </p>

            <div className="space-y-4">
              {TEMPLATE_KEYS.map((key) => {
                const info = TEMPLATE_LABELS[key]
                return (
                  <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{info.label}</p>
                      <p className="text-sm text-zinc-500">{info.description}</p>
                    </div>
                    <Switch
                      checked={toggles[key]}
                      onCheckedChange={(checked) =>
                        setToggles((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                )
              })}
            </div>

            {/* hidden inputs for sender info (keep existing values) */}
            <input type="hidden" name="sender_name" value={settings.sender_name} />
            <input type="hidden" name="sender_email" value={settings.sender_email} />
            <input type="hidden" name="admin_notification_emails" value={settings.admin_notification_emails ?? ''} />

            <Button type="submit" disabled={isPending} className="mt-6">
              {isPending ? '저장 중...' : '토글 저장'}
            </Button>
          </form>
        </Card>
      </TabsContent>

      {/* 발송 로그 */}
      <TabsContent value="logs">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">최근 발송 내역 (최대 100건)</h3>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-zinc-500">발송 로그가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시각</TableHead>
                    <TableHead>템플릿</TableHead>
                    <TableHead>수신자</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>오류</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatTime(log.attempted_at)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {TEMPLATE_LABELS[log.template_key]?.label ?? log.template_key}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {log.recipient_email}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {log.subject}
                      </TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs text-red-600">
                        {log.error_message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  )
}
