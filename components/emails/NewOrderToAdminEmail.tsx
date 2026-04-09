/**
 * 새 발주 접수 알림 (관리자에게)
 */
import { Text, Link } from '@react-email/components'
import EmailLayout, { emailStyles } from './EmailLayout'

interface Props {
  orderNo: string
  dealerName: string
  contactName: string
  itemCount: number
  totalAmount: string
  submittedAt: string
  adminUrl: string
}

export default function NewOrderToAdminEmail({
  orderNo, dealerName, contactName, itemCount, totalAmount, submittedAt, adminUrl,
}: Props) {
  return (
    <EmailLayout previewText={`새 발주 접수 - ${orderNo}`}>
      <Text style={emailStyles.title}>새 발주가 접수되었습니다</Text>

      <table style={emailStyles.table}>
        <tbody>
          <tr><td style={emailStyles.th}>발주번호</td><td style={emailStyles.td}>{orderNo}</td></tr>
          <tr><td style={emailStyles.th}>거래처</td><td style={emailStyles.td}>{dealerName} ({contactName})</td></tr>
          <tr><td style={emailStyles.th}>품목 수</td><td style={emailStyles.td}>{itemCount}종</td></tr>
          <tr><td style={emailStyles.th}>합계</td><td style={{ ...emailStyles.td, fontWeight: 'bold' }}>{totalAmount}</td></tr>
          <tr><td style={emailStyles.th}>접수 시각</td><td style={emailStyles.td}>{submittedAt}</td></tr>
        </tbody>
      </table>

      <Link href={adminUrl} style={emailStyles.button}>
        관리자 페이지에서 확인
      </Link>
    </EmailLayout>
  )
}
