-- ============================================================================
-- ترباوية — سجل الإشعارات المُرسلة يدويًا من لوحة الأدمن
-- RLS مفعّل بدون policies: السيرفر (service_role) بس اللي بيقرا ويكتب
-- ============================================================================
create table if not exists notifications_log (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  url text,
  audience text not null check (audience in ('all','owners','customers')),
  sent_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table notifications_log enable row level security;
