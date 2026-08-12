-- ============================================================================
-- ترباوية — جدول أسرار التطبيق
-- RLS مفعّل من غير أي policies: محدش يقدر يقرا أو يكتب فيه غير السيرفر
-- بمفتاح service_role. بيتستخدم لتخزين مفاتيح VAPID (إشعارات الـ push)
-- المولّدة أوتوماتيك من السيرفر أول مرة — من غير أي إعداد يدوي.
-- ============================================================================
create table if not exists app_secrets (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

alter table app_secrets enable row level security;
