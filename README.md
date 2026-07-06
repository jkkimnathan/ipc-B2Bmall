# iPC B2B Mall

인텍앤컴퍼니 iPC 브랜드의 B2B 유통 파트너 시스템입니다.
거래처(딜러)가 표준 PC와 리퍼 부품을 발주하고, 맞춤 견적(RFQ)을 요청하며,
관리자가 상품·거래처·발주·견적을 관리합니다.

## 기술 스택

- **Next.js 16** (App Router, Server Components/Actions) · React 19 · TypeScript
- **Supabase** — Auth, Postgres(RLS), Storage
- **Tailwind CSS 4** + shadcn/Base UI · lucide-react · sonner
- **Resend** + react-email — 트랜잭션 메일

## 주요 기능

| 영역 | 내용 |
|---|---|
| 랜딩 | 제품 라인업(Business/Pro/Master/**AI**), 리퍼 부품 스토어 소개 |
| 딜러 | 표준 PC 카탈로그, **리퍼 부품 카탈로그(등급제·실재고)**, 통합 장바구니/발주, RFQ→견적→발주 전환, 배송지/사용자 관리 |
| 관리자 | 대시보드, 거래처 승인/관리, 표준 PC·**리퍼 부품** 등록/관리, 발주 상태 처리, 견적서 작성/발송, 알림 설정 |
| 시스템 | 발주/RFQ 감사 이벤트, 이메일 로그, 리퍼 재고 원자적 예약/복원 |

## 시작하기

```bash
npm install
cp .env.example .env.local   # 없다면 아래 환경변수 표를 참고해 작성
npm run dev
```

### 환경변수

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 롤 키 (서버 전용, 절대 노출 금지) |
| `ADMIN_EMAILS` | 관리자 이메일 목록 (쉼표 구분) |
| `RESEND_API_KEY` | Resend API 키 |
| `NEXT_PUBLIC_SITE_URL` | 배포 URL (메일 링크/메타데이터 기준) |

## 데이터베이스

`supabase/migrations/` 를 순서대로 적용합니다 (Supabase SQL Editor 또는 CLI).

- `001`–`012` : 기본 스키마 (거래처/PC/발주/견적/장바구니/이벤트/메일)
- `013` : **AiPC(aipc) 카테고리** 추가
- `014` : **리퍼 부품** 테이블 + 다형 장바구니/발주 + 재고 예약 함수
- `015` : **전 테이블 RLS** (`is_admin()` / `current_dealer_id()`)
- `016` : Storage 버킷 정책
- `017` : order_items 참조 무결성 CHECK

### ⚠️ 배포 체크리스트 (RLS 관련 — 중요)

1. **관리자 시드**: 마이그레이션 015 적용 시 `admin_users` 테이블에
   `ADMIN_EMAILS` 환경변수의 **모든** 이메일을 INSERT해야 합니다.
   관리자 콘솔은 세션 클라이언트로 DB에 접근하므로, `admin_users`에 없는
   관리자는 RLS에 의해 즉시 차단됩니다. 두 목록은 항상 함께 갱신하세요.

   ```sql
   insert into admin_users (email) values ('admin@example.com')
   on conflict (email) do nothing;
   ```

2. **Storage 버킷**: `product-thumbnails`, `product-details`, `rfq-attachments`
   버킷이 존재해야 하며(상품 이미지 버킷은 public), 016 정책 적용 전
   기존의 더 넓은 정책이 있다면 정리해야 합니다.

3. **알림 설정**: 관리자 콘솔 → 설정에서 수신 이메일을 확인하세요.

## 보안

- 전 테이블 **Row Level Security** — 딜러는 자기 거래처 데이터만 접근,
  관리자는 `is_admin()` 기준 전체 접근, 시스템 작업은 service role 사용
- **CSP** + X-Frame-Options(DENY) + HSTS + nosniff 등 보안 헤더 (`next.config.ts`)
- 미들웨어 라우트 가드(`/admin/*`, `/dealer/*`) + 서버 액션마다
  `requireAdmin()` / `requireDealer()` 재검증
- 리퍼 재고는 SECURITY DEFINER 함수로 원자적 차감(음수 불가), 취소/반려 시
  CAS(조건부 상태 전환)로 중복 복원 방지

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버
npm run lint    # ESLint
```
