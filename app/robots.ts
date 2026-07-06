import type { MetadataRoute } from 'next'

/** 공개 랜딩 페이지는 색인 허용, 관리자/거래처 비공개 영역은 차단 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/dealer'] },
  }
}
