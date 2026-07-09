# 배포 가이드 (보안 하드닝 반영)

이 문서는 코드 리뷰 후속 보안/정합성 수정(마이그레이션 `018_security_hardening.sql` 포함)을
운영에 안전하게 배포하기 위한 절차다. **코드 배포 전/직후에 아래 DB·스토리지 작업을 반드시 수행**해야
관리자 잠김이나 기능 오류가 발생하지 않는다.

## 0. 사전 점검 (매우 중요)

`018` 은 관리자 판별 기준을 강화했다. `is_admin()` 은 이제 **`admin_users` 테이블에 등록되고
이메일이 확인된(`auth.users.email_confirmed_at`) 계정**만 관리자로 인정한다.

배포 전 다음을 확인한다.

1. `ADMIN_EMAILS` 환경변수의 **모든** 관리자 이메일이 `admin_users` 테이블에 들어 있어야 한다.
   ```sql
   insert into admin_users (email) values
     ('admin1@intechonline.kr'),
     ('admin2@intechonline.kr')
   on conflict (email) do nothing;
   ```
2. 각 관리자 이메일에 대응하는 Supabase Auth 계정이 존재하고 **이메일이 확인**되어 있어야 한다
   (Auth 대시보드에서 확인, 또는 관리자에게 확인 메일 처리 요청).
   - 확인되지 않았다면 관리자 콘솔의 모든 DB 접근이 차단된다.

## 1. 마이그레이션 적용

```bash
# Supabase CLI 사용 시
supabase db push          # 로컬 마이그레이션을 원격에 적용
# 또는 대시보드 SQL 편집기에서 018_security_hardening.sql, 019_set_default_address.sql 실행
```

적용 후 확인:
- `select proname from pg_proc where proname in ('is_admin','current_dealer_id','next_doc_seq','touch_last_login','set_default_address');`
- `select tgname from pg_trigger where tgname = 'trg_dealers_guard';`
- 금액 컬럼 타입: `\d orders` → `total_amount bigint`.

## 2. 스토리지 버킷 설정 (대시보드에서 1회)

`018` 은 정책을 거래처 경로 스코프로 조정했지만, **공개 버킷은 RLS 를 우회**하므로 버킷 자체를
비공개로 전환해야 실질적 보호가 된다.

1. **rfq-attachments**: 버킷을 **Private** 로 전환.
   - 앱은 저장 시 "경로"만 보관하고, 조회 시 서버에서 signed URL(10분)을 생성한다.
   - 정책은 `018` 이 생성함(거래처는 자기 폴더만, 관리자는 전체).
2. **dealer-documents**: 이미 Private 여야 한다. `018` 이 관리자 전용 select 정책을 추가.
3. **product-thumbnails / product-details**: 공개 읽기 유지(상품 이미지). 변경 없음.

## 3. 환경변수 점검

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용. **절대 클라이언트 노출 금지** |
| `ADMIN_EMAILS` | 관리자 이메일 화이트리스트(쉼표 구분). `admin_users` 와 일치시킬 것 |
| `NEXT_PUBLIC_SITE_URL` | 이메일 링크 절대 URL. 미설정 시 localhost 폴백 |
| `RESEND_API_KEY` | 이메일 발송 |
| `ADMIN_NOTIFICATION_EMAILS` | (선택) 관리자 알림 수신 폴백 |

## 4. Supabase Auth 정책 (권장)

`is_admin()` 은 확인된 이메일에 고정되어 스푸핑을 크게 완화하지만, 공개 셀프 가입을 켜 두면
불필요한 pending 계정/사업자번호 스쿼팅 위험이 있다.

- Auth → Providers: **불필요한 소셜 로그인 비활성화**.
- Auth → Email: 셀프 가입 정책 검토(거래처는 관리자 승인 흐름을 사용하므로 공개 가입 불필요).
- 이메일 확인(Confirm email) **켜기**.

## 5. 빌드 & 배포

```bash
npm ci
npm run build     # 통과 확인 (현재 tsc/eslint 오류 0, build 성공)
# Vercel 등에 배포 (환경변수 설정 후)
```

## 6. 배포 후 스모크 테스트

- [ ] 관리자 로그인 → 대시보드/거래처/발주/견적 목록 정상 표시(빈 화면이면 §0 관리자 시드 확인)
- [ ] 거래처 로그인 → 상품 목록/장바구니/발주 제출 정상, 발주번호 `PO-YYYYMMDD-NNNN` 생성
- [ ] 견적 요청 → 관리자 견적 발송 → 거래처 수락 → 발주 자동 생성(중복 없음)
- [ ] 거래처 상세 응답에 `admin_memo`/관리자 이메일이 포함되지 않는지 네트워크 탭 확인
- [ ] RFQ 첨부 업로드/다운로드(자기 것만), 타 거래처 첨부 접근 차단 확인
- [ ] 사업자등록증 업로드(관리자 상세에서 signed URL 열람) 확인
- [ ] 비밀번호 재설정 링크 흐름 정상(로그인 상태만으로는 폼이 열리지 않음)

## 롤백

문제 발생 시 앱은 이전 커밋으로 롤백하되, `018` 의 DB 변경은 파괴적이지 않다(정책 강화/컬럼 확장).
관리자 잠김이 의심되면 우선 §0 의 `admin_users` 시드와 이메일 확인 상태부터 점검한다.
