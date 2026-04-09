-- ============================================================
-- 이메일 발송 로그 + 알림 설정
-- 운영 중 90일 이상 된 로그는 정기 삭제 권장
-- ============================================================

-- 이메일 발송 로그
create table if not exists email_logs (
  id uuid primary key default uuid_generate_v4(),
  template_key text not null,
  recipient_type text not null check (recipient_type in ('dealer', 'admin')),
  recipient_email text not null,
  recipient_name text,
  subject text not null,

  related_order_id uuid references orders(id) on delete set null,
  related_rfq_id uuid references quote_requests(id) on delete set null,
  related_dealer_id uuid references dealers(id) on delete set null,

  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  provider_message_id text,
  error_message text,

  attempted_at timestamptz default now(),
  sent_at timestamptz
);

create index if not exists idx_email_logs_status on email_logs(status, attempted_at desc);
create index if not exists idx_email_logs_order on email_logs(related_order_id);
create index if not exists idx_email_logs_rfq on email_logs(related_rfq_id);

-- 알림 설정 (시스템 전역, 단일 행)
create table if not exists notification_settings (
  id uuid primary key default uuid_generate_v4(),

  dealer_order_submitted boolean default true,
  dealer_order_approved boolean default true,
  dealer_order_rejected boolean default true,
  dealer_order_shipped boolean default true,
  dealer_rfq_submitted boolean default true,
  dealer_quote_sent boolean default true,
  dealer_dealer_approved boolean default true,

  admin_new_dealer boolean default true,
  admin_new_order boolean default true,
  admin_new_rfq boolean default true,

  admin_notification_emails text,

  sender_name text default 'iPC Mall',
  sender_email text default 'noreply@intechonline.kr',

  updated_at timestamptz default now()
);

insert into notification_settings (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;
