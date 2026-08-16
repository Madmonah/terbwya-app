-- ============================================================================
-- ترباوية — نظام الفروع
-- المطعم نفسه = الفرع الرئيسي، والفروع الإضافية في restaurant_branches.
-- كل طلب بيتوجه تلقائيًا لأقرب نقطة استلام مفتوحة (رئيسي أو فرع) لموقع
-- العميل، وبياخد snapshot (pickup_*) عشان الطيار يروح المكان الصح.
-- النسخة الكاملة للدوال المحدثة (create_order + دوال الطيار) متطبقة على
-- Supabase باسم restaurant_branches.
-- ============================================================================

create table if not exists restaurant_branches (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  city text,
  district text,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_branches_restaurant on restaurant_branches(restaurant_id);

alter table restaurant_branches enable row level security;

drop policy if exists "public read branches of published restaurants" on restaurant_branches;
create policy "public read branches of published restaurants" on restaurant_branches
  for select using (
    exists (select 1 from restaurants r where r.id = restaurant_id and r.status = 'published')
  );

drop policy if exists "owner manage own branches" on restaurant_branches;
create policy "owner manage own branches" on restaurant_branches
  for all using (is_restaurant_owner(restaurant_id))
  with check (is_restaurant_owner(restaurant_id));

alter table orders
  add column if not exists branch_id uuid references restaurant_branches(id) on delete set null,
  add column if not exists pickup_name text,
  add column if not exists pickup_address text,
  add column if not exists pickup_lat double precision,
  add column if not exists pickup_lng double precision;
