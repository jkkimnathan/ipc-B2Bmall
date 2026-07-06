import type { NextConfig } from "next";

// Supabase Storage 호스트명 (환경변수 우선, 없으면 프로덕션 기본값)
function supabaseHostname(): string {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (url) return new URL(url).hostname
  } catch { /* ignore */ }
  return 'zwwkvutyglibxcguvxpd.supabase.co'
}

// 보안 응답 헤더 (모든 라우트에 적용)
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
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
