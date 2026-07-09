/**
 * 프록시(구 미들웨어) - 관리자 및 거래처 라우트 보호
 *
 * Next 16부터 middleware 파일 컨벤션이 deprecated 되어 proxy.ts(runtime: nodejs)로 이전.
 *
 * /admin/* : 관리자 이메일 화이트리스트 검증
 * /dealer/* : Supabase 세션 존재 여부만 확인 (상세 권한은 requireDealer()에서)
 *
 * 예외 경로:
 * - /admin/login, /dealer/login, /dealer/signup, /dealer/signup/complete
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// 관리자 이메일 화이트리스트 확인 (프록시 전용)
function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

// 거래처 공개 페이지 (세션 불필요)
const DEALER_PUBLIC_PATHS = ['/dealer/login', '/dealer/signup', '/dealer/signup/complete', '/dealer/forgot-password', '/dealer/reset-password']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Supabase 클라이언트 생성 (쿠키 읽기/쓰기 핸들링)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신 (getUser() 호출로 쿠키 갱신)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ─── /admin 라우트 처리 ───
  if (pathname === '/admin/login') {
    if (user && isAdminEmail(user.email)) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (pathname.startsWith('/admin')) {
    if (!user || !isAdminEmail(user.email)) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ─── /dealer 라우트 처리 ───

  // 거래처 공개 페이지: 세션 검증 없이 통과
  // (로그인 상태에서도 /dealer/login 접근 허용 — requireDealer가 최종 판단)
  if (DEALER_PUBLIC_PATHS.includes(pathname)) {
    return supabaseResponse
  }

  // 보호된 /dealer/* 페이지: 세션 없으면 로그인으로
  if (pathname.startsWith('/dealer')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dealer/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/dealer/:path*'],
}
