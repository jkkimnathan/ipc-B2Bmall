/**
 * 새 견적 요청 접수 알림 (관리자에게)
 */
import { Text, Link } from '@react-email/components'
import EmailLayout, { emailStyles } from './EmailLayout'

interface Props {
  rfqNo: string
  dealerName: string
  contactName: string
  title: string
  quantity: number
  purpose: string
  submittedAt: string
  adminUrl: string
}

export default function NewRfqToAdminEmail({
  rfqNo, dealerName, contactName, title, quantity, purpose, submittedAt, adminUrl,
}: Props) {
  return (
    <EmailLayout previewText={`새 견적 요청 - ${rfqNo}`}>
      <Text style={emailStyles.title}>새 견적 요청이 접수되었습니다</Text>

      <table style={emailStyles.table}>
        <tbody>
          <tr><td style={emailStyles.th}>RFQ 번호</td><td style={emailStyles.td}>{rfqNo}</td></tr>
          <tr><td style={emailStyles.th}>거래처</td><td style={emailStyles.td}>{dealerName} ({contactName})</td></tr>
          <tr><td style={emailStyles.th}>제목</td><td style={emailStyles.td}>{title}</td></tr>
          <tr><td style={emailStyles.th}>수량</td><td style={emailStyles.td}>{quantity}대</td></tr>
          <tr><td style={emailStyles.th}>용도</td><td style={emailStyles.td}>{purpose}</td></tr>
          <tr><td style={emailStyles.th}>접수 시각</td><td style={emailStyles.td}>{submittedAt}</td></tr>
        </tbody>
      </table>

      <Link href={adminUrl} style={emailStyles.button}>
        관리자 페이지에서 확인
      </Link>
    </EmailLayout>
  )
}
