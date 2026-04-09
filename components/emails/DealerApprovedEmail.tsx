/**
 * 거래처 가입 승인 완료 알림
 */
import { Text, Link } from '@react-email/components'
import EmailLayout, { emailStyles } from './EmailLayout'

interface Props {
  dealerName: string
  contactName: string
  loginId: string
  tempPassword: string
  loginUrl: string
}

export default function DealerApprovedEmail({
  dealerName, contactName, loginId, tempPassword, loginUrl,
}: Props) {
  return (
    <EmailLayout previewText={`${dealerName}님의 가입이 승인되었습니다`}>
      <Text style={emailStyles.title}>iPC Mall 가입이 승인되었습니다</Text>
      <Text style={emailStyles.paragraph}>
        안녕하세요, {contactName}님.
      </Text>
      <Text style={emailStyles.paragraph}>
        {dealerName}의 iPC Mall 가입신청이 승인되었습니다.
        아래 계정 정보로 로그인하실 수 있습니다.
      </Text>

      <table style={emailStyles.table}>
        <tbody>
          <tr>
            <td style={emailStyles.th}>로그인 ID</td>
            <td style={emailStyles.td}>{loginId}</td>
          </tr>
          <tr>
            <td style={emailStyles.th}>임시 비밀번호</td>
            <td style={{ ...emailStyles.td, fontWeight: 'bold', color: '#dc2626' }}>
              {tempPassword}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={emailStyles.warning}>
        첫 로그인 후 반드시 비밀번호를 변경해주세요.
      </div>

      <Link href={loginUrl} style={emailStyles.button}>
        로그인하기
      </Link>
    </EmailLayout>
  )
}
