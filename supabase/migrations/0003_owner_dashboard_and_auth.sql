-- ============================================================================
-- ترباوية — نظام تسجيل أصحاب المطاعم + الداشبورد + تتبع الطلبات
-- يبني على auth.users (Supabase Auth) لتسجيل دخول حقيقي لأصحاب المطاعم،
-- ويضيف RLS policies تسمح لكل صاحب مطعم بإدارة مطعمه فقط.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) ربط restaurant_owners بـ auth.users بشكل أساسي (كل صاحب حساب = صف واحد)
-- ----------------------------------------------------------------------------
alter table restaurant_owners
  add column if not exists email text;

create unique index if not exists idx_restaurant_owners_auth_user
  on restaurant_owners(auth_user_id) where auth_user_id is not null;

-- ----------------------------------------------------------------------------
-- 2) دالة مساعدة: هل المستخدم الحالي مالك المطعم ده؟
-- ----------------------------------------------------------------------------
create or replace function is_restaurant_owner(p_restaurant_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from restaurants r
    join restaurant_owners o on o.id = r.owner_id
    where r.id = p_restaurant_id
      and o.auth_user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- 3) دالة مساعدة: جلب صف restaurant_owners الخاص بالمستخدم الحالي (أو NULL)
-- ----------------------------------------------------------------------------
create or replace function current_owner_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from restaurant_owners where auth_user_id = auth.uid() limit 1;
$$;

-- ----------------------------------------------------------------------------
-- 4) RLS: restaurant_owners — كل مستخدم يشوف/يعدّل صفه بس
-- ----------------------------------------------------------------------------
alter table restaurant_owners enable row level security;

drop policy if exists "owner can read own row" on restaurant_owners;
create policy "owner can read own row" on restaurant_owners
  for select using (auth_user_id = auth.uid());

drop policy if exists "owner can update own row" on restaurant_owners;
create policy "owner can update own row" on restaurant_owners
  for update using (auth_user_id = auth.uid());

drop policy if exists "authenticated can create own owner row" on restaurant_owners;
create policy "authenticated can create own owner row" on restaurant_owners
  for insert with check (auth_user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5) RLS: restaurants — المالك يقدر يضيف/يعدّل/يشوف مطاعمه (منشورة أو draft)
-- ----------------------------------------------------------------------------
drop policy if exists "owner can read own restaurants" on restaurants;
create policy "owner can read own restaurants" on restaurants
  for select using (
    owner_id = current_owner_id()
  );

drop policy if exists "owner can insert own restaurants" on restaurants;
create policy "owner can insert own restaurants" on restaurants
  for insert with check (
    owner_id = current_owner_id()
  );

drop policy if exists "owner can update own restaurants" on restaurants;
create policy "owner can update own restaurants" on restaurants
  for update using (
    owner_id = current_owner_id()
  );

-- ----------------------------------------------------------------------------
-- 6) RLS: menu_items / menu_item_sizes / restaurant_photos — إدارة كاملة للمالك
-- ----------------------------------------------------------------------------
drop policy if exists "owner can manage own menu items" on menu_items;
create policy "owner can manage own menu items" on menu_items
  for all using (is_restaurant_owner(restaurant_id))
  with check (is_restaurant_owner(restaurant_id));

drop policy if exists "owner can manage own menu sizes" on menu_item_sizes;
create policy "owner can manage own menu sizes" on menu_item_sizes
  for all using (
    exists (select 1 from menu_items mi where mi.id = menu_item_id and is_restaurant_owner(mi.restaurant_id))
  )
  with check (
    exists (select 1 from menu_items mi where mi.id = menu_item_id and is_restaurant_owner(mi.restaurant_id))
  );

drop policy if exists "owner can manage own photos" on restaurant_photos;
create policy "owner can manage own photos" on restaurant_photos
  for all using (is_restaurant_owner(restaurant_id))
  with check (is_restaurant_owner(restaurant_id));

-- ----------------------------------------------------------------------------
-- 7) RLS: orders / order_items — المالك يشوف طلبات مطعمه ويعدّل الحالة
-- ----------------------------------------------------------------------------
drop policy if exists "owner can read own orders" on orders;
create policy "owner can read own orders" on orders
  for select using (is_restaurant_owner(restaurant_id));

drop policy if exists "owner can update own orders" on orders;
create policy "owner can update own orders" on orders
  for update using (is_restaurant_owner(restaurant_id));

drop policy if exists "owner can read own order items" on order_items;
create policy "owner can read own order items" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and is_restaurant_owner(o.restaurant_id))
  );

-- عميل الطلب (ضيف) يقدر يشوف طلبه بالرقم المرجعي فقط عبر public select محدود
drop policy if exists "public can read order by reference" on orders;
create policy "public can read order by reference" on orders
  for select using (true);

drop policy if exists "public can read order items" on order_items;
create policy "public can read order items" on order_items
  for select using (true);

-- ----------------------------------------------------------------------------
-- 8) status الافتراضي للمطاعم الجديدة من الفورم = pending_review
--    (بدل draft) عشان يبقى واضح إنها لسه محتاجة مراجعة قبل النشر الفعلي
-- ----------------------------------------------------------------------------
alter table restaurants drop constraint if exists restaurants_status_check;
alter table restaurants add constraint restaurants_status_check
  check (status in ('draft','pending_review','published','suspended'));

-- ----------------------------------------------------------------------------
-- 9) دالة publish: المالك ينشر مطعمه بعد ما يخلص الفورم (تتحول pending_review→published)
-- ----------------------------------------------------------------------------
create or replace function publish_own_restaurant(p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_restaurant_owner(p_restaurant_id) then
    raise exception 'not_authorized';
  end if;
  update restaurants
    set status = 'published', updated_at = now()
    where id = p_restaurant_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 10) دالة لتغيير حالة الطلب (owner فقط، وبقيم مسموحة)
-- ----------------------------------------------------------------------------
create or replace function update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from orders where id = p_order_id;
  if v_restaurant_id is null then
    raise exception 'order_not_found';
  end if;
  if not is_restaurant_owner(v_restaurant_id) then
    raise exception 'not_authorized';
  end if;
  if p_status not in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled') then
    raise exception 'invalid_status';
  end if;
  update orders set status = p_status, updated_at = now() where id = p_order_id;
end;
$$;
