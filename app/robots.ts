import type { MetadataRoute } from 'next'

/** B2B 비공개 몰 — 모든 크롤러 차단 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
