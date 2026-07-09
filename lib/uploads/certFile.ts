/**
 * 사업자등록증 업로드 파일 서버측 검증 유틸
 *
 * 클라이언트가 보낸 MIME 타입/확장자를 신뢰하지 않고,
 * 허용 목록 + 크기 + 매직 바이트(파일 시그니처)로 실제 내용까지 확인한다.
 * 가입 신청(익명)과 마이페이지 재업로드(거래처)가 공용으로 사용.
 */
import 'server-only'

const ALLOWED_EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export const CERT_MAX_BYTES = 10 * 1024 * 1024 // 10MB

export type CertFileValidation =
  | { ok: true; contentType: string; ext: string; bytes: Uint8Array }
  | { ok: false; error: string }

/** 선두 바이트가 시그니처와 일치하는지 확인 */
function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((b, i) => bytes[offset + i] === b)
}

/** 파일 내용(매직 바이트)이 선언된 MIME 타입과 일치하는지 확인 */
function matchesMagicBytes(bytes: Uint8Array, contentType: string): boolean {
  switch (contentType) {
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff])
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'image/webp':
      // RIFF....WEBP
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
    case 'application/pdf':
      // %PDF-
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])
    default:
      return false
  }
}

/**
 * 사업자등록증 파일 검증. 통과 시 업로드에 쓸 bytes/contentType/ext 를 돌려준다.
 * (스토리지 업로드는 File 재소비 대신 검증에 사용한 bytes 를 그대로 올릴 것)
 */
export async function validateCertFile(file: File): Promise<CertFileValidation> {
  const ext = ALLOWED_EXT_BY_TYPE[file.type]
  if (!ext) {
    return { ok: false, error: '이미지(JPG/PNG/WebP) 또는 PDF 파일만 업로드할 수 있습니다.' }
  }
  if (file.size > CERT_MAX_BYTES) {
    return { ok: false, error: '파일 크기는 10MB 이하만 업로드할 수 있습니다.' }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length === 0) {
    return { ok: false, error: '빈 파일은 업로드할 수 없습니다.' }
  }
  if (!matchesMagicBytes(bytes, file.type)) {
    return { ok: false, error: '파일 내용이 선택한 형식과 일치하지 않습니다. 원본 파일을 다시 확인해주세요.' }
  }

  return { ok: true, contentType: file.type, ext, bytes }
}
