/**
 * 공통 이메일 레이아웃
 * React Email 기반, 모든 이메일 템플릿에서 사용
 */
import {
  Html, Head, Body, Container, Section, Text, Hr, Link,
} from '@react-email/components'
import type { ReactNode } from 'react'

interface EmailLayoutProps {
  previewText?: string
  children: ReactNode
}

export default function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html lang="ko">
      <Head />
      {previewText && (
        <span style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
          {previewText}
        </span>
      )}
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* 헤더 */}
          <Section style={headerStyle}>
            <Text style={logoStyle}>iPC Mall</Text>
          </Section>

          {/* 본문 */}
          <Section style={contentStyle}>
            {children}
          </Section>

          {/* 푸터 */}
          <Hr style={hrStyle} />
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              인텍앤컴퍼니 |{' '}
              <Link href="mailto:sales@intech.co.kr" style={linkStyle}>
                sales@intech.co.kr
              </Link>
            </Text>
            <Text style={disclaimerStyle}>
              이 메일은 발신 전용입니다. 문의는 위 이메일로 부탁드립니다.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// 스타일
const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: '20px 0',
}

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  backgroundColor: '#1e40af',
  padding: '20px 30px',
}

const logoStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: 0,
}

const contentStyle: React.CSSProperties = {
  padding: '30px',
}

const hrStyle: React.CSSProperties = {
  borderColor: '#e4e4e7',
  margin: '0 30px',
}

const footerStyle: React.CSSProperties = {
  padding: '20px 30px',
}

const footerTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#71717a',
  margin: '0 0 4px',
}

const linkStyle: React.CSSProperties = {
  color: '#1e40af',
  textDecoration: 'none',
}

const disclaimerStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#a1a1aa',
  margin: 0,
}

// 공통 요소 스타일 (템플릿에서 import해 사용)
export const emailStyles = {
  title: {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#18181b',
    margin: '0 0 16px',
  } satisfies React.CSSProperties,

  paragraph: {
    fontSize: '14px',
    color: '#3f3f46',
    lineHeight: '1.6',
    margin: '0 0 12px',
  } satisfies React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    margin: '16px 0',
  } satisfies React.CSSProperties,

  th: {
    textAlign: 'left' as const,
    fontSize: '12px',
    color: '#71717a',
    padding: '8px 12px',
    backgroundColor: '#f4f4f5',
    borderBottom: '1px solid #e4e4e7',
  } satisfies React.CSSProperties,

  td: {
    fontSize: '14px',
    color: '#18181b',
    padding: '8px 12px',
    borderBottom: '1px solid #f4f4f5',
  } satisfies React.CSSProperties,

  button: {
    display: 'inline-block',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    textDecoration: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    margin: '16px 0',
  } satisfies React.CSSProperties,

  highlight: {
    backgroundColor: '#eff6ff',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #bfdbfe',
    margin: '16px 0',
  } satisfies React.CSSProperties,

  warning: {
    backgroundColor: '#fef3c7',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #fde68a',
    margin: '16px 0',
    fontSize: '13px',
    color: '#92400e',
  } satisfies React.CSSProperties,
}
