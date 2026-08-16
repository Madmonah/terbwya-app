-- ============================================================================
-- ترباوية — نظام العروض بتايم لاين
-- المطعم يجدول عروض بفترة زمنية (من - إلى)، ومفيش عرضين يتداخلوا في الوقت.
-- الخصم في create_order بقى بيتقرا من العرض النشط (active_offer_percent)
-- بدل عمود discount_percent القديم على restaurants (اترحّلت بياناته واتصفّر).
-- النسخة الكاملة للدوال المحدثة متطبقة على Supabase باسم
-- restaurant_offers_timeline.
-- ============================================================================

create extension if not exists btree_gist;

create table if not exists restaurant_offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 90),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  exclude using gist (restaurant_id with =, tstzrange(starts_at, ends_at) with &&)
);

create index if not exists idx_offers_restaurant on restaurant_offers(restaurant_id);
create index if not exists idx_offers_ends on restaurant_offers(ends_at);

alter table restaurant_offers enable row level security;

drop policy if exists "public read offers of published restaurants" on restaurant_offers;
create policy "public read offers of published restaurants" on restaurant_offers
  for select using (
    exists (select 1 from restaurants r where r.id = restaurant_id and r.status = 'published')
  );

drop policy if exists "owner manage own offers" on restaurant_offers;
create policy "owner manage own offers" on restaurant_offers
  for all using (is_restaurant_owner(restaurant_id))
  with check (is_restaurant_owner(restaurant_id));

create or replace function active_offer_percent(p_restaurant_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(discount_percent), 0)
  from restaurant_offers
  where restaurant_id = p_restaurant_id
    and now() >= starts_at
    and now() < ends_at;
$$;
