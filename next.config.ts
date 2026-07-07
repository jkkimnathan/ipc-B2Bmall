import type { NextConfig } from "next";

// Supabase Storage 호스트명 (환경변수 우선, 없으면 프로덕션 기본값)
function supabaseHostname(): string {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (url) return new URL(url).hostname
  } catch { /* ignore */ }
  return 'zwwkvutyglibxcguvxpd.supabase.co'
}

// Content-Security-Policy
// Next.js는 인라인 부트스트랩 스크립트를, Tailwind는 인라인 스타일을 사용하므로
// script/style 에 'unsafe-inline'을 허용하되, 프레이밍/object/base-uri 는 차단한다.
// Supabase(REST/Storage/Realtime)를 위해 connect/img 에 https:·wss: 를 허용한다.
// 개발 모드(next dev)의 Fast Refresh/HMR은 eval을 사용하므로 dev에서만 허용
const isDev = process.env.NODE_ENV === 'development'

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ')

// 보안 응답 헤더 (모든 라우트에 적용)
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // 서버 액션 요청 본문 크기 제한 (사업자등록증 최대 10MB 업로드 대응)
  experimental: {
    serverActions: {
      bodySizeLimit: '11mb',
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname(),
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
