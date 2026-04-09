/**
 * 테스트 이메일 템플릿
 */
import { Text } from '@react-email/components'
import EmailLayout, { emailStyles } from './EmailLayout'

interface Props {
  recipientName: string
  sentAt: string
}

export default function TestEmail({ recipientName, sentAt }: Props) {
  return (
    <EmailLayout previewText="iPC Mall 이메일 테스트">
      <Text style={emailStyles.title}>이메일 발송 테스트</Text>
      <Text style={emailStyles.paragraph}>
        안녕하세요, {recipientName}님.
      </Text>
      <Text style={emailStyles.paragraph}>
        이 메일은 iPC Mall 이메일 발송 기능의 테스트 메일입니다.
        이 메일을 정상 수신하셨다면 이메일 설정이 올바르게 구성된 것입니다.
      </Text>
      <Text style={{ ...emailStyles.paragraph, color: '#71717a', fontSize: '12px' }}>
        발송 시각: {sentAt}
      </Text>
    </EmailLayout>
  )
}
