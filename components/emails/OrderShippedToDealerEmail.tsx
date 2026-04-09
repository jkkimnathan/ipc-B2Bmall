/**
 * 출고 완료 알림 (거래처에게)
 */
import { Text, Link } from '@react-email/components'
import EmailLayout, { emailStyles } from './EmailLayout'

interface Props {
  dealerName: string
  contactName: string
  orderNo: string
  shippedAt: string
  orderUrl: string
}

export default function OrderShippedToDealerEmail({
  dealerName, contactName, orderNo, shippedAt, orderUrl,
}: Props) {
  return (
    <EmailLayout previewText={`발주 ${orderNo} 출고 완료`}>
      <Text style={emailStyles.title}>출고가 완료되었습니다</Text>
      <Text style={emailStyles.paragraph}>
        안녕하세요, {contactName}님. {dealerName}의 발주 출고가 완료되었습니다.
      </Text>

      <table style={emailStyles.table}>
        <tbody>
          <tr><td style={emailStyles.th}>발주번호</td><td style={emailStyles.td}>{orderNo}</td></tr>
          <tr><td style={emailStyles.th}>출고일시</td><td style={emailStyles.td}>{shippedAt}</td></tr>
        </tbody>
      </table>

      <Link href={orderUrl} style={emailStyles.button}>
        발주 상세 보기
      </Link>
    </EmailLayout>
  )
}
