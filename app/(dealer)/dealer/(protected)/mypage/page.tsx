/**
 * 거래처 마이페이지 - 회사 정보 탭
 */
import Link from 'next/link'
import { requireDealer } from '@/lib/auth/dealer'
import { formatBusinessNo } from '@/lib/utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MypageNav from '@/components/dealer/MypageNav'
import CompanyInfoForm from '@/components/dealer/CompanyInfoForm'
import BusinessCertCard from '@/components/dealer/BusinessCertCard'

export default async function MypagePage() {
  const session = await requireDealer()
  const dealer = session.dealer

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">마이페이지</h1>
        <p className="text-sm text-zinc-500 mt-1">회사 정보와 담당자를 관리합니다</p>
      </div>

      <MypageNav active="info" isPrimary={session.dealerUser.is_primary} />

      {/* 사업자 정보 (읽기 전용) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">사업자 정보</CardTitle>
          <p className="text-xs text-zinc-400">변경 사항이 있으면 영업담당에게 연락해주세요.</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="상호" value={dealer.company_name} />
          <InfoRow label="사업자번호" value={formatBusinessNo(dealer.business_no)} />
          <InfoRow label="대표자" value={dealer.ceo_name} />
          <InfoRow label="업태" value={dealer.business_type} />
          <InfoRow label="종목" value={dealer.business_item} />
        </CardContent>
      </Card>

      {/* 연락처/주소 (수정 가능) */}
      <CompanyInfoForm
        phone={dealer.phone}
        postalCode={dealer.postal_code}
        address={dealer.address}
      />

      {/* 사업자등록증 */}
      <BusinessCertCard certUrl={dealer.business_cert_url} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value || '—'}</span>
    </div>
  )
}
