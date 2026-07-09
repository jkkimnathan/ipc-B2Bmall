# 스펙: 코드 감사 리포트 잔여 항목 일괄 적용

- 작성일: 2026-07-09
- 근거: `CODE_AUDIT_REPORT.md` (2026-07-09) 중 최신 master(5dd0e4c)에서 아직 해결되지 않은 항목
- 승인: 사용자가 "다 진행해봐"로 전체 범위 승인 (게이트 일괄 통과)

## 목표

감사 리포트의 잔여 6개 항목을 운영 안전성 순서로 적용한다.

1. **의존성 보안 업데이트 (#7)** — `next` 16.2.2 → 16.2.10+, `eslint-config-next` 동반 업데이트, `npm audit fix`
2. **middleware → proxy 전환 (#10)** — Next 16 deprecation 대응. `middleware.ts` → `proxy.ts`, 함수명 `proxy`로 변경 (runtime: nodejs)
3. **server-only 가드 (#11)** — service role 키를 다루는 모듈에 `import 'server-only'` 추가 (`lib/supabase/admin.ts`, `lib/supabase/server.ts`, `lib/email/*`)
4. **가입 업로드 검증 강화 (#5)** — 사업자등록증 업로드에 서버측 MIME/크기/매직바이트 검증 + 실패 시 업로드 파일/거래처 행 롤백. 공용 헬퍼 `lib/uploads/certFile.ts`로 가입/마이페이지 재업로드 통일
5. **이메일 발송 실패 감지 (#12)** — 운영 환경에서 `RESEND_API_KEY` 미설정 시 `success: false` + `failed` 로그로 처리 (개발 환경은 기존 skip 유지)
6. **기본 배송지 트랜잭션화 (#16)** — 마이그레이션 `019`에 `set_default_address()` RPC(단일 트랜잭션) 추가, `setDefaultAddress` 액션에서 호출

## 비목표 (이번에 안 하는 것)

- 가입 rate limit / CAPTCHA — 서버리스 인메모리 방식은 무의미. Vercel WAF/Attack Challenge 등 인프라 레벨 권장 (운영 체크리스트에 기록)
- 주소 생성/수정 시의 기본 배송지 2단계 갱신 — partial unique index(`005`)가 최악의 경우를 막고 있어 유지
- RLS/스토리지 등 이미 master에서 해결된 항목

## 완료 기준

- [ ] `npm run build` 통과
- [ ] `npx tsc --noEmit` 통과
- [ ] `npx eslint app components lib types proxy.ts next.config.ts` 통과
- [ ] `npm audit --audit-level=high` 통과 (또는 잔여 취약점 명시)
- [ ] proxy 전환 후 빌드에서 middleware deprecation 경고 소멸
- [ ] 가입 액션: 위조 확장자 파일(내용≠형식) 거부, DB 실패 시 스토리지 고아 파일 미발생 (코드 리뷰로 확인)

## 위험 요소

- Next 패치 업데이트: 마이너 범위 내(16.2.x)라 위험 낮음. 빌드+수동 스모크로 확인
- proxy 전환: edge → nodejs 런타임 변경이지만 현재 미들웨어는 Supabase SSR 쿠키 처리만 하므로 nodejs에서 문제 없음
- `019` 마이그레이션은 배포 후 Supabase에 적용 필요 (`supabase db push` 또는 SQL 편집기)
