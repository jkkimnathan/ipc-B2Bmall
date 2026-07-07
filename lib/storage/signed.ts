/**
 * RFQ 첨부파일 signed URL 생성 — 서버 사이드 전용
 *
 * rfq-attachments 는 비공개 버킷이며, DB(attachment_urls)에는 버킷 내
 * "경로(path)"만 저장한다. 조회 시 service_role 로 짧은 수명의 signed URL 을
 * 생성하여 렌더링한다. 서명 실패 시 url 은 빈 문자열로 두어 링크를 비활성화한다.
 */
import { createAdminClient } from '@/lib/supabase/admin'

export interface SignedAttachment {
  path: string
  url: string
  name: string
}

const BUCKET = 'rfq-attachments'
const EXPIRES_IN = 60 * 10 // 10분

/** 경로에서 사람이 읽을 파일명 추출 (타임스탬프 접두어 제거 시도) */
function fileNameFromPath(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/^\d+_/, '')
}

/**
 * 저장된 경로(또는 과거 데이터의 전체 URL)를 signed URL 로 변환한다.
 * 과거에 전체 public URL 로 저장된 값도 경로를 추출해 처리한다.
 */
export async function signRfqAttachments(paths: string[]): Promise<SignedAttachment[]> {
  if (!paths || paths.length === 0) return []

  const admin = createAdminClient()

  // 과거 데이터 호환: 전체 URL 이면 버킷 뒤 경로만 추출
  const normalized = paths.map((p) => {
    const marker = `/${BUCKET}/`
    const idx = p.indexOf(marker)
    return idx === -1 ? p : p.slice(idx + marker.length)
  })

  const results: SignedAttachment[] = []
  for (const path of normalized) {
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, EXPIRES_IN)
    results.push({
      path,
      url: error || !data ? '' : data.signedUrl,
      name: fileNameFromPath(path),
    })
    if (error) {
      console.error('[signRfqAttachments] 서명 실패:', error.message, { path })
    }
  }
  return results
}
