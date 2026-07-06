# iPC B2B Mall 전체 코드 리뷰 보고서

- 작성일: 2026-07-06
- 대상: `master` HEAD (`896ea54`) 기준 등록된 전체 소스 (앱/컴포넌트/lib/미들웨어/DB 마이그레이션/타입 — 소스 약 21,700줄)
- 방법: 6개 영역(DB·RLS / 인증·미들웨어 / 관리자 / 거래처 / lib·이메일 / 클라이언트 컴포넌트) 병렬 정밀 리뷰 후, 상위 심각도 발견은 원본 코드로 직접 재검증
- 자동 검사: `tsc --noEmit` **통과(오류 0)**, `eslint` **오류 0 / 경고 17건**(미사용 import, `<img>` 사용 등 경미)

## 총평

인증·권한 규율은 대체로 우수합니다. 모든 서버 액션이 자체적으로 `requireAdmin()`/`requireDealer()`를 호출하고(레이아웃 가드에만 의존하지 않음), 결제/견적 전환 시 가격을 서버에서 재조회하며, 리퍼 재고는 원자적 SQL RPC로 예약합니다. 그러나 **가장 보안이 중요한 015/016 RLS 계층에 체계적 결함**이 있습니다. 거래처 정책이 "행 단위"만 제한하고 "컬럼 단위" 제한이 없어, 공개 anon 키 + 자신의 JWT로 PostgREST를 직접 호출하면 정지 계정 자가 복구·견적가 조작·감사로그 위조가 가능합니다. 또한 재고 조작 RPC가 전체 공개, 타 거래처 RFQ 첨부가 열람 가능합니다.

앱 로직 쪽 공통 약점은 세 가지입니다. (1) **다단계 쓰기의 트랜잭션/롤백 부재**(견적 수락, 거래처 승인/생성, 스토리지-DB 순서), (2) **서버측 입력 검증 부재**(NaN/음수/Infinity/`JSON.parse`, `.or()` 필터 주입), (3) **실패해서는 안 되는 지점에서의 조용한 오류 삼킴**(재고 복원, 감사 이벤트, 알림 설정 읽기). 여기에 **KST 시간대 미적용**이 전역적으로 존재해 견적 유효기한이 최대 33시간, 이메일 시각이 9시간 어긋납니다.

아래 발견은 심각도순으로 정렬했으며, `✔ 직접검증` 표시는 원본 코드/마이그레이션을 직접 확인한 항목입니다.

---

## CRITICAL

### C1. 재고 조작 RPC가 모든 인증 사용자에게 공개 ✔ 직접검증
- 위치: `supabase/migrations/014_refurb_parts.sql:91-113`
- `reserve_refurb_stock`, `restore_refurb_stock`가 `security definer`인데 `REVOKE EXECUTE ... FROM public/authenticated`가 없습니다. PostgREST가 이를 RPC로 노출하므로, 로그인한 거래처가 `POST /rpc/restore_refurb_stock {"p_part_id": "...", "p_qty": 100000}`로 재고를 임의 증가시키거나, `reserve_refurb_stock`을 반복 호출해 경쟁 상품 재고를 0으로 소진할 수 있습니다(RLS 우회 — definer 권한). 함수 내부의 원자적 UPDATE 자체는 올바릅니다(음수 재고 불가). 노출이 문제입니다.
- 조치: `revoke execute on function reserve_refurb_stock(uuid,int), restore_refurb_stock(uuid,int) from public, anon, authenticated;` 후 `service_role`에만 grant, 또는 함수 내부에 `is_admin()` 가드 추가.

### C2. 정지된 거래처의 자가 재활성화 (권한 상승) ✔ 직접검증
- 위치: `supabase/migrations/015_row_level_security.sql:53-63`(`current_dealer_id()`), `:122-124`(`dealers_update_own`)
- `current_dealer_id()`는 `dealer_users.is_active`만 확인하고 `dealers.status`는 확인하지 않습니다. 그리고 `dealers_update_own`은 컬럼 제한 없는 `for update`입니다. 관리자가 `dealers.status='suspended'`로 정지해도 `dealer_users` 행은 여전히 활성이므로, 거래처가 `PATCH /dealers?id=eq.<own> {"status":"active"}`로 정지를 스스로 해제할 수 있습니다. `business_no`, `erp_code`, `approved_at`, `memo`도 임의 변경 가능합니다.
- 조치: `current_dealer_id()`가 `dealers`를 조인해 `status='active'`를 요구하도록 하고, 거래처가 쓸 수 있는 컬럼만 `GRANT UPDATE (postal_code, address, phone, ...)`로 한정(RLS는 컬럼 단위 제한 불가).

### C3. 타 거래처 RFQ 첨부파일 열람/업로드 ✔ 직접검증
- 위치: `supabase/migrations/016_storage_policies.sql:41-49`
- `rfq_attachments_auth_read`/`auth_insert`가 `bucket_id='rfq-attachments'`만 검사하고 거래처별 경로/소유자 제한이 없습니다. 인증된 거래처 A가 버킷을 조회해 거래처 B의 견적 사양/단가 문서를 내려받을 수 있고, 임의 경로에 쓸 수 있습니다. 게다가 이 버킷은 `getPublicUrl`로 사용됩니다(M-항목 참조) — 공개 버킷이면 URL만 알면 인증 없이도 열람됩니다.
- 조치: `using (bucket_id='rfq-attachments' and (storage.foldername(name))[1] = current_dealer_id()::text)` 형태로 소유자/경로 프리픽스 제한, 버킷을 private로 전환하고 signed URL 사용.

---

## HIGH

### H1. `acceptQuote` — CAS 부재로 주문 이중 생성 + 항목 실패 시 고아 주문 ✔ 직접검증
- 위치: `app/(dealer)/dealer/(protected)/quotes/actions.ts:307-455`
- 이 코드베이스의 다른 모든 상태 전환은 CAS 패턴(`.update(...).eq('status', ...)`, 예: `cancelOrder`, `rejectOrder`)을 쓰는데, `acceptQuote`만 read-then-write입니다. line 322에서 `rfq.status !== 'quoted'`를 읽기만 하고, line 352에서 주문을 무조건 insert합니다. 더블클릭/두 탭이면 둘 다 통과해 **하나의 견적에 두 개의 실주문**이 생성됩니다. 또한 line 391에서 `order_items` insert 실패 시 이미 생성된 주문 행을 삭제하지 않아 **항목 0개의 고아 주문**이 남습니다(반면 `submitOrder`는 롤백 삭제 수행).
- 조치: `update quote_requests set status='converting' where id=? and status='quoted' returning id`로 먼저 조건부 전환 후 0행이면 중단, 그다음 주문 생성. 항목 insert 실패 시 주문 행 삭제.

### H2. 발주번호 생성이 거래처 간 충돌 → 발주 생성 실패 ✔ 직접검증
- 위치: `checkout/actions.ts:18-31`, `quotes/actions.ts:291-301`(동일 중복)
- `generateOrderNo`는 RLS가 적용된 유저 클라이언트로 `orders`를 `count`하는데, `orders_select_own` 정책상 **자기 거래처 주문만** 집계됩니다. `order_no`에는 전역 unique 제약(`001_initial_schema.sql:81`)이 있습니다. 결과적으로 서로 다른 거래처의 "그날 N번째 주문"이 같은 `PO-YYYYMMDD-000N`을 생성해 unique 위반으로 insert 실패합니다. 단일 거래처 내에서도 카운트 기반이라 경쟁 조건에 취약하고, 롤백 삭제가 카운트를 되돌려 번호가 재발급됩니다.
- 조치: DB 시퀀스 또는 `SECURITY DEFINER` RPC로 전역 채번, 혹은 admin 클라이언트로 카운트 + unique 위반 재시도.

### H3. 내부 메모(`admin_memo`)가 거래처 브라우저로 유출 ✔ 직접검증
- 위치: `app/(dealer)/dealer/(protected)/orders/[id]/page.tsx:24,52-56`, `quotes/[id]/page.tsx:27,54-58`
- `orders.admin_memo`/`quotes.admin_memo`는 "거래처에 노출 안 됨"이라고 UI가 명시한 내부 전용 필드입니다. 페이지가 `select('*')`로 행 전체를 읽어 클라이언트 컴포넌트 prop으로 넘깁니다. Next.js는 렌더 여부와 무관하게 **모든 prop을 RSC/HTML 페이로드에 직렬화**하므로, 거래처가 자기 주문 페이지의 네트워크 응답을 열면 관리자 내부 메모(여신 한도·마진 등)를 읽을 수 있습니다.
- 조치: 명시적 컬럼 화이트리스트로 select(`admin_memo` 제외) 또는 클라이언트 전달 전 DTO로 정제.

### H4. 관리자 신원이 JWT `email` 클레임에만 고정 → 공개 가입 시 관리자 탈취
- 위치: `middleware.ts:14-21`, `lib/auth/admin.ts:16-25`, `supabase/migrations/015_row_level_security.sql:39-50`
- 앱(`isAdminEmail`)과 DB(`is_admin()`) 모두 JWT의 email 문자열이 화이트리스트에 있으면 관리자로 인정합니다. anon 키는 공개(`NEXT_PUBLIC`)이고, 리포지토리 어디에서도 Supabase 프로젝트의 셀프 가입/OAuth를 비활성화하지 않습니다. Supabase에서 이메일 가입이 켜져 있고 이메일 확인이 없거나 미검증 이메일 제공자가 켜져 있으면, 공격자가 `signUp({ email: '<관리자 이메일>' })`로 세션을 얻어 미들웨어·`requireAdmin()`·`is_admin()`의 전 테이블 권한을 모두 획득합니다(RLS 전체 붕괴).
- 조치: 관리자를 email이 아닌 `auth.uid()` 기반 서버 관리 테이블로 고정, `email_confirmed_at` 요구, 프로젝트 레벨에서 공개 가입/제공자 제한. 최소한 검증된 이메일 + 신뢰 프로세스로 프로비저닝된 행을 요구.

### H5. 거래처가 견적가/발주 상태를 직접 조작 (전체 컬럼 쓰기 RLS) ✔ 직접검증
- 위치: `supabase/migrations/015_row_level_security.sql:154-156, 159-163, 181-185`
- `orders_update_own`, `order_items_own`, `quotes_update_own`이 컬럼 제한 없는 광범위 `update`/`for all` 정책입니다. 의도는 좁은 거래처 액션(수락/거절, 1시간 내 편집)이지만 실제로는 전 컬럼 수정이 허용됩니다. 거래처가 관리자가 발행한 견적의 `unit_price`/`total_amount`를 낮춘 뒤 주문으로 전환하거나, `draft` 견적을 `accepted`로 만들거나, 자기 주문을 `completed`로 바꾸는 것이 앱의 비즈니스 규칙을 우회해 PostgREST로 가능합니다.
- 조치: 컬럼 단위 GRANT로 허용 컬럼 한정, 혹은 모든 변경을 `SECURITY DEFINER` RPC/service-role 서버 액션으로만 라우팅하고 거래처 update 정책 제거.

### H6. 거래처가 소속 사용자 자가 승인/계정 링크 위조 ✔ 직접검증
- 위치: `supabase/migrations/015_row_level_security.sql:130-135`
- `dealer_users_insert_own`/`update_own`이 `dealer_id`만 검사하고 `is_active`/`is_primary`/`auth_user_id` 제한이 없습니다. 앱은 신규 사용자를 `is_active=false`(관리자 승인 대기)로 넣지만, 거래처가 직접 `is_active=true`로 자가 승인하거나 `is_primary`를 뒤집거나 `auth_user_id`를 임의 UID로 설정해 계정 링크를 조작할 수 있습니다.
- 조치: 컬럼 GRANT 제한 + 트리거/definer RPC로 `is_active=false`/`is_primary=false` 강제, 거래처의 `auth_user_id` 설정 금지.

### H7. 관리자 주문 전환(승인/생산/출고/완료)이 CAS 미적용 (TOCTOU) ✔ 직접검증
- 위치: `app/(admin)/admin/(dashboard)/orders/actions.ts:64-72`(`approveOrder`), 유사하게 `startProduction`/`markShipped`/`completeOrder`
- `rejectOrder`(127-138)와 `adminCancelOrder`(302-313)는 주석까지 달며 CAS(`.eq('status', ...)`)를 쓰는데, 승인/생산/출고/완료는 앞선 read에서만 상태를 검증하고 무조건 update합니다. 거래처가 1시간 취소 창에서 취소(재고 복원)하는 동시에 관리자가 승인하면, 승인이 나중에 도착해 **취소된 주문이 승인 상태로 부활**하고 재고가 이중 계산됩니다.
- 조치: 네 전환 모두 `.eq('status', order.status).select('id')` + 0행 체크 추가.

### H8. 견적 상태머신 우회 — 수락/전환된 견적을 덮어쓰기
- 위치: `app/(admin)/admin/(dashboard)/quotes/actions.ts:66-135`(`saveQuoteDraft`), `:156-232`(`sendQuote`)
- 두 액션 모두 `rfq.status`/`existing.status`를 검증하지 않습니다. UI는 `isQuoteEditable()`로 막지만 서버 액션은 직접 호출 가능한 HTTP 엔드포인트입니다. 이미 `accepted`/`converted_to_order`(주문 생성됨) 상태의 RFQ에 `sendQuote`를 호출하면 합의된 견적가가 덮어쓰이고 RFQ가 `quoted`로 되돌아가 기존 주문과 모순됩니다. `saveQuoteDraft`는 `sent`/`accepted` 견적을 `draft`로 강등시킵니다. 또한 line 174-178의 `.single()`은 견적이 2건 이상이면 에러→무시되어 중복 견적을 또 INSERT합니다.
- 조치: 허용 소스 상태(`submitted`/`quoted`, `draft`/`sent`)로 가드 + CAS, `.maybeSingle()` 사용 또는 `quotes.rfq_id` unique 제약.

### H9. 파일 업로드가 Next.js 16 기본 1MB 본문 한도에 걸려 가입 실패
- 위치: `components/dealer/DealerSignupForm.tsx:58,97`, `components/dealer/BusinessCertCard.tsx:27-36`, `next.config.ts`(설정 없음)
- 두 컴포넌트가 원본 `File`을 서버 액션으로 전송하며 "10MB 이하"를 표시합니다. Next.js 16의 서버 액션 본문 기본 한도는 **1MB**(번들 문서 `serverActions.md` 확인)인데 `serverActions.bodySizeLimit`이 설정돼 있지 않습니다. 2~8MB 사업자등록증 스캔본을 첨부하면 핸들러 실행 전에 요청이 거부되어 온보딩 전체가 실패합니다.
- 조치: `next.config.ts`에 `serverActions: { bodySizeLimit: '11mb' }` 추가, 또는 클라이언트에서 스토리지로 직접 업로드하고 경로만 전달.

### H10. 관리자 상품 카테고리 필터 값 불일치 → 항상 0건 ✔ 직접검증
- 위치: `components/admin/products/ProductFilters.tsx:56-75`(값: `business-entry`, `pro-creator` …) vs `ProductForm.tsx:238-241`(저장: `business`/`pro`/`master`/`aipc`), 필터 실행 `products/page.tsx:41`(`.eq('category', category)`)
- 필터 옵션이 구 분류 체계라 어떤 저장값과도 일치하지 않고, `aipc`는 옵션에 아예 없습니다. 관리자가 카테고리로 필터링하면 항상 0건이 나와 데이터 소실처럼 보입니다. (거래처측 `ProductCatalog.tsx`는 올바른 값 사용.)
- 조치: 필터 옵션을 `business/pro/master/aipc`로 정렬.

### H11. 거래처 승인/생성의 부분 실패 — 롤백 없음, 고아 Auth 계정
- 위치: `dealers/actions.ts:143-146`(`approveDealer`), `:78-91`(`createDealerWithUser`)
- `approveDealer`: `dealer_users` 링크 업데이트 결과를 확인하지 않아, 실패해도 dealer는 `active`가 되고 임시 비밀번호 이메일은 발송되지만 `auth_user_id`는 null로 남아 **로그인은 되나 거래처에 연결 안 된 깨진 계정**이 됩니다. 이후 단계 실패 시 생성된 Auth 유저도 롤백하지 않아 재승인이 "email already exists"로 영구 실패합니다. `createDealerWithUser`도 3단계 실패 시 `active` dealer + 고아 Auth 계정이 남고, `contact_email`/`business_no`를 검증하지 않습니다(`isValidBusinessNo()` 미사용).
- 조치: 각 단계 오류 확인, 실패 시 생성된 Auth 유저/dealer 삭제, 이메일·사업자번호 사전 검증.

### H12. 스토리지 이미지를 DB 쓰기 전에 삭제 → 실패 시 깨진 이미지 참조
- 위치: `products/actions.ts:106-129`(동일 패턴 `refurb/actions.ts:108-135`, 삭제 경로 `products/actions.ts:51`)
- `deleteStorageFiles(...)`를 먼저 실행한 뒤 DB update를 수행합니다. SKU를 중복값으로 바꿔 update가 23505로 실패하면 파일은 이미 삭제됐는데 DB는 삭제된 URL을 계속 가리켜 스토어에 깨진 이미지가 남고 복구 불가합니다. `deleteProduct`/`deleteRefurbPart`도 FK(23503) 실패 전에 이미지를 지웁니다.
- 조치: DB 쓰기 성공 후에만 스토리지 객체 삭제.

### H13. 비밀번호 재설정 페이지가 기존 세션을 복구 세션으로 취급 ✔ 직접검증
- 위치: `app/(dealer)/dealer/reset-password/page.tsx:34-37,56-58`
- `getSession()`에 세션이 있으면(`PASSWORD_RECOVERY` 이벤트가 아니어도) 폼을 활성화하고, `updateUser({ password })`는 기존 비밀번호를 요구하지 않습니다. 이 경로는 `DEALER_PUBLIC_PATHS`라 미들웨어가 리다이렉트하지 않습니다. 공유/키오스크 브라우저에 거래처 세션이 남아 있으면 누구나 `/dealer/reset-password`를 열어 재인증 없이 비밀번호를 변경(계정 탈취)할 수 있습니다.
- 조치: 폼을 `PASSWORD_RECOVERY` 이벤트로만 활성화, 기존 로그인 세션을 재설정 권한으로 인정하지 않기, `updateUser` 전 재인증 요구.

---

## MEDIUM

### M1. 금액 컬럼이 `integer` — 대량 B2B 주문 시 오버플로 ✔ 직접검증
- 위치: `001_initial_schema.sql:64,87,125,148`, `014_refurb_parts.sql:34`
- `sale_price`, `orders.total_amount`, `quotes.total_amount`, `order_items.subtotal`, `budget_per_unit`가 모두 `integer`(최대 약 21.5억원). 1,000대 × 300만원 = 30억원 주문은 int4 초과로 insert 오류 또는 잘못된 집계를 유발합니다. 도매 PC 주문에서 현실적입니다.
- 조치: 금액 컬럼을 `bigint`로 변경.

### M2. `dealer-documents` 버킷에 스토리지 정책 없음 + 공개 URL 저장 불일치
- 위치: `016_storage_policies.sql`(해당 버킷 누락), `components/admin/dealers/DealerForm.tsx:96-105`, `dealers/[id]/page.tsx:42-47`
- 사업자등록증(민감 PII)이 `dealer-documents`에 저장되지만 016은 이 버킷 정책을 정의하지 않습니다. RLS 적용 시 관리자의 `createSignedUrl`이 실패해 인증서 열람이 불가하거나, 기존 넓은 정책에 의존하면 전 세계 공개가 됩니다. 게다가 DealerForm은 `getPublicUrl().publicUrl`(전체 URL)을 저장하는데 상세 페이지는 경로를 기대하는 `createSignedUrl`을 호출하므로, 관리자 등록 거래처의 인증서는 항상 열람 실패합니다(가입 경로는 경로만 저장 — 정상).
- 조치: `dealer-documents`에 admin-only 정책 추가, DealerForm이 경로를 저장하도록 수정, 서버 액션 경유 업로드.

### M3. `.or()` 필터 주입 (관리자/거래처 목록 검색)
- 위치: 관리자 `dealers/page.tsx:44`, `orders/page.tsx:61`, `products/page.tsx:37`, `quotes/page.tsx:49`, `refurb/page.tsx:37`; 거래처 `quotes/page.tsx:58`, `products/page.tsx:31`, `refurb/page.tsx:34`
- URL 검색어 `q`가 PostgREST `.or()` 표현식에 그대로 보간됩니다. `,` `)` `.` 같은 문자로 추가 필터항을 주입하거나 쿼리를 깨뜨릴 수 있습니다. 거래처 목록은 상위 `.eq('dealer_id')`가 AND라 테넌시 자체는 못 벗어나지만, 카탈로그(products/refurb, `is_active`만 제한)는 `q="x,is_active.eq.false"`로 비활성 상품 노출 가능하고, 오류 메시지가 노출/무시되어 오탐을 유발합니다.
- 조치: `q`에서 PostgREST 메타문자 이스케이프/제거, 또는 이스케이프된 값으로 `.or()` 빌드.

### M4. 재고 복원/감사 이벤트/알림 설정 읽기 실패의 조용한 삼킴
- 위치: `lib/refurb/stock.ts:19-21,27-40`, `lib/orders/events.ts:42-44`, `lib/rfq/events.ts:38-40`, `lib/rfq/autoExpire.ts:37-57`, `lib/email/settings.ts:14-42`
- `restoreRefurbStock`은 RPC 결과를 버리고, `restoreRefurbStockForOrder`는 select 실패 시 `items=null`로 아무것도 복원 안 함(로그·재시도 없음). CAS로 이미 한 번만 실행되게 막아둔 취소/반려 이후에 실행되므로 일시적 실패면 **재고가 영구 손실**됩니다. 감사 이벤트 insert 실패는 `console.error`만 하므로 상태 변경은 됐는데 타임라인 기록이 없는 상태가 생깁니다. `getNotificationSettings`는 읽기 실패 시 모든 토글 ON 기본값으로 fail-open(관리자가 끈 이메일이 다시 발송).
- 조치: 오류 확인 후 최소 로깅/보상, 취소+복원을 단일 트랜잭션 RPC로, 설정 읽기는 "행 없음(PGRST116)"과 "쿼리 오류"를 구분.

### M5. 서버측 숫자/JSON 입력 검증 부재 (NaN/음수/Infinity/파싱 예외)
- 위치: `products/actions.ts:73-87`, `refurb/actions.ts:72-89`, `quotes/actions.ts(admin):36-47`, 거래처 `cart/actions.ts:22,60`, `quotes/actions.ts:39,170`
- `JSON.parse(spec_json)`는 예외를 그대로 던져 파일의 `{ error }` 규약을 깨고, `parseInt`/`Number`가 음수·NaN·Infinity·소수를 통과시킵니다. 음수 `stock_quantity`는 재고 예약 수식을 깨고, `Number('1e999')=Infinity`가 `>0` 가드를 통과하며, `calcValidUntil(NaN)`은 `RangeError`를 던집니다. 수량 상한도 없어 큰 값 × 단가가 int4를 넘어 원시 DB 오류가 납니다.
- 조치: 공용 FormData 검증 헬퍼로 `Number.isSafeInteger(x) && x >= 0`(수량 `>= 1`) + 합리적 상한 + `JSON.parse` try/catch.

### M6. KST 시간대 미적용 — 유효기한·이메일 시각 오차 ✔ 직접검증
- 위치: `lib/utils/format.ts:8-9,13-27,297-301`, `lib/rfq/expiry.ts:11-16`
- `calcValidUntil`은 `toISOString()`(UTC 날짜)를 써서 00:00~08:59 KST 생성 견적의 유효기한이 하루 당겨집니다. `formatDateTime`/`formatDate`는 `timeZone:'Asia/Seoul'` 미지정이라 UTC 호스트에서 한국 수신자에게 9시간 이전 시각을 표시하고, 클라이언트/서버 revalidate 시 하이드레이션 불일치를 유발합니다. `expiry.ts`의 `daysUntilExpiry`는 프로세스 로컬 자정 기준이라 서버(UTC)와 브라우저(KST)가 9시간 동안 다른 만료 판정을 냅니다(H1과 합쳐 최대 33시간 오차).
- 조치: 날짜 경계·표시를 모두 `Asia/Seoul`로 계산(`Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })` 또는 date-fns v4 `TZDate`).

### M7. 관리자 이메일이 거래처 노출 타임라인의 `actor_name`으로 유출
- 위치: 관리자 `orders/actions.ts`(승인/생산/출고 등)·`quotes/actions.ts:240`이 `actorName: admin.email ?? '관리자'` + `isVisibleToDealer:true`; 거래처 상세가 `select('*')`로 이벤트 조회
- 거래처가 자기 주문/견적 상세의 응답에서 `actor_name`으로 모든 관리자 개인 이메일을 읽을 수 있습니다.
- 조치: `actorName`에 역할/표시명("관리자")을 넣고 이메일은 `metadata`(`isVisibleToDealer:false`)로.

### M8. 관리자 재고 절대값 저장이 원자적 예약 RPC와 경쟁
- 위치: `refurb/actions.ts:131`
- 관리자 수정 폼은 페이지 로드시 스냅샷한 `stock_quantity`를 절대값으로 되씁니다. 편집 폼을 연 사이 거래처 주문이 재고를 예약(10→7)하면, 관리자가 무관한 필드를 저장할 때 재고가 10으로 리셋되어 초과 판매가 발생합니다.
- 조치: 일반 update에서 재고 제외, 재고는 전용 delta/RPC로만 조정.

### M9. 첨부 URL 미검증 + RFQ 첨부 공개 버킷
- 위치: 거래처 `quotes/actions.ts:60-62,79`(URL 검증 없음), `QuoteRequestForm.tsx:175-188,230`(`getPublicUrl`), 렌더 `admin quotes/[id]/page.tsx:191-199`
- 거래처가 폼을 우회해 임의 문자열(`javascript:` URI, 피싱 URL, 타 테넌트 경로)을 `attachment_urls`로 제출할 수 있고, 이것이 관리자 콘솔에 "첨부파일" 링크로 렌더됩니다. 또한 `rfq-attachments`는 공개 버킷이라 URL만 알면 누구나 열람 가능(C3와 연결).
- 조치: 각 URL이 이 거래처의 `rfq-attachments` 경로 내인지 서버 검증, private 버킷 + signed URL.

### M10. 대량 데이터 대비 페이지네이션 부재 + 클라이언트 후처리 필터
- 위치: 관리자 `orders/page.tsx:92,107-118`, `quotes/page.tsx:68,86-95`, `dealers/page.tsx:33`, `products/page.tsx:30`, `refurb/page.tsx:30`
- 회사명 검색을 `limit(100)` DB fetch **이후** JS로 적용해 100건 밖 매치는 안 보이고 "총 N건"이 틀립니다. 일부 목록은 limit 없이 전체 fetch(데이터 증가 시 메모리/지연).
- 조치: 실제 페이지네이션 + 검색을 쿼리로 이동.

### M11. 이메일/발신자 주소 검증 부재
- 위치: `settings/actions.ts:37-39`
- `sender_email`/`admin_notification_emails`를 형식 검증 없이 저장합니다. 오타 하나로 시스템 전체 아웃바운드 이메일(승인·자격증명 발송)이 조용히 중단됩니다.
- 조치: upsert 전 각 주소(쉼표 목록 포함) 검증.

### M12. 사업자등록증 업로드 서버측 검증 부재
- 위치: `mypage/actions.ts:37-67`, `signup/actions.ts:75`
- 파일 타입/크기 검증 없이 클라이언트 제공 `contentType`을 그대로 사용합니다. 거래처가 `text/html`인 `.html`/`.svg`를 업로드하면 스토리지 서빙 방식에 따라 저장형 XSS/피싱이 가능합니다(경로는 `dealer.id` 스코프라 크로스테넌트 덮어쓰기는 없음).
- 조치: MIME 화이트리스트(pdf/jpg/png) + 최대 크기 + 서버측 확장자 검증 + 고정 `contentType`.

---

## LOW (요약)

- **L1** `is_admin()`가 변경 가능한 JWT email 클레임 신뢰 → `app_metadata.role` 권장 (`015:46-49`).
- **L2** `admin_users` 테이블 vs `ADMIN_EMAILS` env — 이중 진실 소스, 수동 동기화 필요(불일치 시 조용한 관리자 잠금 또는 과다 권한).
- **L3** 대부분의 관리자 페이지가 자체 `requireAdmin()` 없이 레이아웃 가드에만 의존(데이터는 RLS로 완화되나 Next 16 문서가 경고). `requireAdmin()`은 `cache()`라 비용 0 — 각 페이지에 추가 권장.
- **L4** 감사로그 위조: `order_events_insert_own`/`rfq_events_insert_own`이 `actor_type`/`to_status`/`is_visible_to_dealer` 임의 지정 허용 (`015:192-205`).
- **L5** `총계/subtotal` 컬럼에 `>= 0` CHECK 및 `subtotal = unit_price × qty` 일관성 강제 없음.
- **L6** 타입 드리프트: `standard_pcs.category`가 SQL은 nullable인데 TS는 non-null, `admin_users` 테이블이 `types/database.ts`에 없음, 헤더 주석 "7개 테이블" 낡음.
- **L7** `restoreRefurbStock`/예약이 인프라 오류와 재고 부족을 구분 못 함 → 사용자에게 "재고 부족" 오표시 (`lib/refurb/stock.ts:13-16`).
- **L8** `generateOrderNo`/`generateRfqNo`/`generateQuoteNo`가 UTC 날짜 + 로컬 시간 혼용, `Math.random()` 4자리 초당 충돌 가능.
- **L9** "바로 발주"가 add-to-cart 실패 시에도 카트로 이동 (`ProductDetailClient.tsx:139-142`) — refurb는 boolean 반환으로 이미 수정됨.
- **L10** `formatKRW`가 null/undefined 미가드(TypeError), 소수 절삭 없음(KRW에 소수점 표시).
- **L11** 이미지 업로더의 blob URL 누수(재렌더마다 `createObjectURL`, revoke 없음) — `ThumbnailUploader.tsx:100`, `DetailImageUploader.tsx:62-64`.
- **L12** 비밀번호 최소 길이 불일치(재설정 6자 vs 변경 8자), 클라이언트 전용 검증.
- **L13** `dealer_users.email` unique 제약 부재 + 가입 이메일 중복 확인 TOCTOU, RLS 스코프 확인이라 타 거래처 이메일 못 봄.
- **L14** `robots.ts`가 `/`를 disallow하는데 `app/page.tsx`는 `index:true` 지정 — 랜딩 인덱싱 차단.
- **L15** `DealerDetailClient` 거래내역 탭 항상 "없습니다" 하드코딩, `SpecSlotInput`이 누락 키에 TypeError, `CartTable` 전체선택이 비활성 항목 포함/수량 핸들러 stale prop, 필터 디바운스 unmount 미정리 + `push` 히스토리 오염.
- **L16** `middleware.ts` → Next 16에서 `proxy.ts`로 이름 변경(deprecated, 현재는 동작) — 마이그레이션 권장.
- **L17** `generateTempPassword` 모듈로 편향(경미), 임시 비밀번호 평문 이메일 발송(의도된 정책이나 리셋 링크 권장), `getSiteUrl`이 미설정 시 `localhost` 폴백.

---

## 검증 완료(정상)로 확인된 항목

- 모든 서버 액션이 자체 `requireAdmin()`/`requireDealer()` 호출(레이아웃 가드 단독 의존 없음). service-role 사용은 Auth 관리·재고 RPC·롤백 삭제로 한정.
- 결제/견적 전환 시 가격을 DB에서 재조회하고 `updateOrder`는 클라이언트 `{id, quantity}`만 신뢰(단가 무시). 카트/주소/주문/RFQ에 `dealer_id === session.dealer.id` 소유권 확인 존재.
- `reserve_refurb_stock` SQL은 단일 원자적 조건부 UPDATE로 경쟁·음수 재고 방지. 취소/반려의 CAS로 재고 이중 복원 방지.
- 이메일 실패가 비즈니스 흐름을 차단하지 않음(`sendEmail`은 throw 안 함 + caller try/catch). `email_logs`는 근거 주석과 함께 service-role로 기록.
- 9개 이메일 템플릿 모두 사용자 입력을 JSX 텍스트로만 보간(react-email 이스케이프), `dangerouslySetInnerHTML`/원시 HTML 연결/비밀 노출 없음. 수신자 라우팅에 거래처/관리자 교차 유출 없음.
- 클라이언트 파일에 `dangerouslySetInnerHTML`·비밀·service-role 사용 없음. 브라우저는 anon 키 `createBrowserClient`만 사용. 변경 폼에 이중 제출 방지(disabled+pending) 일관 적용.
- 마이그레이션 순서 정합성 양호: 전방 참조 없음, DROP은 `IF EXISTS`, 카테고리 CHECK 진화(003→007→013)가 데이터 UPDATE 후 재제약해 순차 실행 실패 없음.
- `tsc --noEmit` 오류 0, `eslint` 오류 0.

---

## 권장 우선순위

1. **즉시(RLS/스토리지 하드닝):** C1 재고 RPC EXECUTE 회수, C2 `current_dealer_id()` status 확인 + 컬럼 GRANT, C3/M9 `rfq-attachments` 소유자 스코프 + private, H5/H6 컬럼 단위 쓰기 제한, M2 `dealer-documents` 정책.
2. **높음(로직 정합성):** H1 `acceptQuote` CAS + 롤백, H2 발주 채번 전역화, H3/M7 내부필드·관리자이메일 유출 차단(명시 컬럼 select), H7 관리자 전환 CAS, H8 견적 상태 가드, H9 `bodySizeLimit`, H11 승인/생성 롤백, H12 스토리지-DB 순서 역전, H13 재설정 페이지 게이팅.
3. **중간:** M1 `bigint` 전환, M5 입력 검증 헬퍼, M6 KST 시간대, M3 필터 이스케이프, M4 오류 삼킴 제거, H10/M11/M12.
4. **낮음:** L1~L17 하드닝/정리.
