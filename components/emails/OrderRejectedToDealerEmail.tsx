/**
 * 발주 반려 알림 (거래처에게)
 */
import { Text, Link } from '@react-email/components'
import EmailLayout, { emailStyles } from './EmailLayout'

interface Props {
  dealerName: string
  contactName: string
  orderNo: string
  reason: string
  orderUrl: string
}

export default function OrderRejectedToDealerEmail({
  dealerName, contactName, orderNo, reason, orderUrl,
}: Props) {
  return (
    <EmailLayout previewText={`발주 ${orderNo}가 반려되었습니다`}>
      <Text style={emailStyles.title}>발주가 반려되었습니다</Text>
      <Text style={emailStyles.paragraph}>
        안녕하세요, {contactName}님. {dealerName}의 발주가 반려되었습니다.
      </Text>

      <table style={emailStyles.table}>
        <tbody>
          <tr><td style={emailStyles.th}>발주번호</td><td style={emailStyles.td}>{orderNo}</td></tr>
          <tr><td style={emailStyles.th}>반려 사유</td><td style={{ ...emailStyles.td, color: '#dc2626' }}>{reason}</td></tr>
        </tbody>
      </table>

      <Text style={emailStyles.paragraph}>
        문의가 필요하시면 담당자에게 연락해주세요.
      </Text>

      <Link href={orderUrl} style={emailStyles.button}>
        발주 상세 보기
      </Link>
    </EmailLayout>
  )
}
