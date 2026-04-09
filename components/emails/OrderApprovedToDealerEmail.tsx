/**
 * 발주 승인 알림 (거래처에게)
 */
import { Text, Link } from '@react-email/components'
import EmailLayout, { emailStyles } from './EmailLayout'

interface Props {
  dealerName: string
  contactName: string
  orderNo: string
  totalAmount: string
  expectedShipDate: string
  adminMemo?: string
  orderUrl: string
}

export default function OrderApprovedToDealerEmail({
  dealerName, contactName, orderNo, totalAmount, expectedShipDate, adminMemo, orderUrl,
}: Props) {
  return (
    <EmailLayout previewText={`발주 ${orderNo}가 승인되었습니다`}>
      <Text style={emailStyles.title}>발주가 승인되었습니다</Text>
      <Text style={emailStyles.paragraph}>
        안녕하세요, {contactName}님. {dealerName}의 발주가 승인되었습니다.
      </Text>

      <table style={emailStyles.table}>
        <tbody>
          <tr><td style={emailStyles.th}>발주번호</td><td style={emailStyles.td}>{orderNo}</td></tr>
          <tr><td style={emailStyles.th}>합계</td><td style={emailStyles.td}>{totalAmount}</td></tr>
          <tr><td style={emailStyles.th}>출고 예정일</td><td style={{ ...emailStyles.td, fontWeight: 'bold' }}>{expectedShipDate}</td></tr>
        </tbody>
      </table>

      {adminMemo && (
        <div style={emailStyles.highlight}>
          <Text style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
            관리자 전달사항: {adminMemo}
          </Text>
        </div>
      )}

      <Link href={orderUrl} style={emailStyles.button}>
        발주 상세 보기
      </Link>
    </EmailLayout>
  )
}
