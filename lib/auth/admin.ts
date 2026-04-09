/**
 * 관리자 인증/권한 체크 유틸리티
 *
 * 관리자 식별 방식: 환경변수 ADMIN_EMAILS에 등록된 이메일만 관리자로 인정.
 * 서버 컴포넌트 및 서버 액션에서 사용.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * 관리자 이메일 화이트리스트에 포함되는지 체크
 * ADMIN_EMAILS 환경변수를 쉼표로 분리하여 비교한다.
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  return adminEmails.includes(email.toLowerCase())
}

/**
 * 현재 로그인한 유저가 관리자인지 확인 (서버 컴포넌트용)
 * 관리자가 아니거나 로그인하지 않았으면 null 반환.
 */
export async function getAdminUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return null
    if (!isAdminEmail(user.email)) return null

    return user
  } catch {
    return null
  }
}

/**
 * 관리자가 아니면 /admin/login으로 리다이렉트하는 가드
 * 서버 컴포넌트/레이아웃에서 호출하여 페이지를 보호한다.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  return user
}
