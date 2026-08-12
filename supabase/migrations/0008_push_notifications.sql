-- ============================================================================
-- ترباوية — إشعارات Push حقيقية
-- 1) جدول اشتراكات الـ push (لأصحاب المطاعم والعملاء)
-- 2) triggers بتنادي endpoint الإرسال أوتوماتيك عند طلب جديد أو تغيير حالة
--    (الـ endpoint بيرجع يقرا البيانات من الداتابيز بنفسه — مفيش ثقة في payload)
-- ============================================================================

create extension if not exists pg_net;

-- ----------------------------------------------------------------------------
-- 1) جدول الاشتراكات
-- ----------------------------------------------------------------------------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('owner','customer')),
  restaurant_id uuid references restaurants(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subs_restaurant on push_subscriptions(restaurant_id);
create index if not exists idx_push_subs_order on push_subscriptions(order_id);

alter table push_subscriptions enable row level security;

-- صاحب المطعم يدير اشتراكات مطعمه بس (من الداشبورد بجلسته الموثقة)
drop policy if exists "owner manage own push subs" on push_subscriptions;
create policy "owner manage own push subs" on push_subscriptions
  for all using (
    kind = 'owner' and restaurant_id is not null and is_restaurant_owner(restaurant_id)
  )
  with check (
    kind = 'owner' and restaurant_id is not null and is_restaurant_owner(restaurant_id)
  );

-- اشتراكات العملاء بتتسجل فقط عن طريق API route بصلاحية service_role
-- (بعد التحقق من تطابق رقم الموبايل مع الطلب) — مفيش policy عامة هنا

-- ----------------------------------------------------------------------------
-- 2) Triggers: نداء endpoint الإرسال أوتوماتيك
-- ----------------------------------------------------------------------------
create or replace function notify_push_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://terbwya.com/api/push/dispatch',
    body := jsonb_build_object('order_id', NEW.id, 'event', 'new_order'),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return NEW;
end;
$$;

drop trigger if exists trg_push_new_order on orders;
create trigger trg_push_new_order
  after insert on orders
  for each row execute function notify_push_new_order();

create or replace function notify_push_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status is distinct from OLD.status then
    perform net.http_post(
      url := 'https://terbwya.com/api/push/dispatch',
      body := jsonb_build_object('order_id', NEW.id, 'event', 'status_change'),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_push_status_change on orders;
create trigger trg_push_status_change
  after update on orders
  for each row execute function notify_push_status_change();
