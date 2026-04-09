/**
 * 견적서 발송 알림 (거래처에게)
 */
import { Text, Link } from '@react-email/components'
import EmailLayout, { emailStyles } from './EmailLayout'

interface Props {
  dealerName: string
  contactName: string
  rfqNo: string
  title: string
  totalAmount: string
  leadTimeDays: number
  validUntil: string
  isRevise?: boolean
  quoteUrl: string
}

export default function QuoteSentToDealerEmail({
  dealerName, contactName, rfqNo, title, totalAmount, leadTimeDays, validUntil, isRevise, quoteUrl,
}: Props) {
  return (
    <EmailLayout previewText={`견적서 도착 - ${rfqNo}`}>
      <Text style={emailStyles.title}>
        견적서가 {isRevise ? '재발송' : '도착'}했습니다
      </Text>
      <Text style={emailStyles.paragraph}>
        안녕하세요, {contactName}님. {dealerName}의 견적 요청에 대한 견적서를 보내드립니다.
      </Text>

      <table style={emailStyles.table}>
        <tbody>
          <tr><td style={emailStyles.th}>RFQ 번호</td><td style={emailStyles.td}>{rfqNo}</td></tr>
          <tr><td style={emailStyles.th}>제목</td><td style={emailStyles.td}>{title}</td></tr>
          <tr><td style={emailStyles.th}>견적 금액</td><td style={{ ...emailStyles.td, fontWeight: 'bold' }}>{totalAmount}</td></tr>
          <tr><td style={emailStyles.th}>납기</td><td style={emailStyles.td}>{leadTimeDays}영업일</td></tr>
          <tr><td style={emailStyles.th}>유효기한</td><td style={{ ...emailStyles.td, color: '#dc2626', fontWeight: 'bold' }}>{validUntil}</td></tr>
        </tbody>
      </table>

      <div style={emailStyles.warning}>
        유효기한이 지나면 견적서를 수락할 수 없습니다. 기한 내에 확인해주세요.
      </div>

      <Link href={quoteUrl} style={emailStyles.button}>
        견적서 확인하기
      </Link>
    </EmailLayout>
  )
}
