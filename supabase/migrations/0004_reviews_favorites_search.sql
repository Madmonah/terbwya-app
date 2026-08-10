-- ============================================================================
-- ترباوية — تقييمات، مفضلات، بحث، وحساب عملاء
-- الهدف: تجربة استخدام أسرع وأذكى من طلبات (بحث فوري، تقييمات حقيقية،
-- مفضلات وإعادة طلب، تتبع لحظي)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) العملاء: نفس نمط restaurant_owners — تسجيل اختياري بالإيميل/كلمة السر
-- ----------------------------------------------------------------------------
alter table customers
  add column if not exists email text;

create unique index if not exists idx_customers_auth_user
  on customers(auth_user_id) where auth_user_id is not null;

create or replace function current_customer_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from customers where auth_user_id = auth.uid() limit 1;
$$;

-- ----------------------------------------------------------------------------
-- 2) المفضلات
-- ----------------------------------------------------------------------------
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(customer_id, restaurant_id)
);

alter table favorites enable row level security;

drop policy if exists "customer can manage own favorites" on favorites;
create policy "customer can manage own favorites" on favorites
  for all using (customer_id = current_customer_id())
  with check (customer_id = current_customer_id());

-- ----------------------------------------------------------------------------
-- 3) التقييمات: مرتبطة بطلب فعلي (order_id) — منع تقييم بدون طلب حقيقي
-- ----------------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  owner_reply text,
  owner_reply_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id) -- طلب واحد = تقييم واحد بس
);

create index if not exists idx_reviews_restaurant on reviews(restaurant_id);

alter table reviews enable row level security;

-- القراءة العامة لكل التقييمات (زي أي منصة مراجعات)
drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews
  for select using (true);

-- إدخال تقييم: لازم يكون على طلب "delivered" فعليًا، وصاحبه (لو مسجّل) أو ضيف
-- بنفس رقم تليفون الطلب (نتحقق عبر RPC بدل RLS مباشرة لمرونة أكتر)
drop policy if exists "block direct review insert" on reviews;
create policy "block direct review insert" on reviews
  for insert with check (false); -- الإدخال يبقى فقط عبر submit_review() RPC

-- صاحب المطعم يقدر يردّ على التقييم بس
drop policy if exists "owner can reply to own reviews" on reviews;
create policy "owner can reply to own reviews" on reviews
  for update using (is_restaurant_owner(restaurant_id))
  with check (is_restaurant_owner(restaurant_id));

-- RPC آمن لإضافة تقييم: يتحقق إن الطلب فعلاً delivered ومفيهوش تقييم قبل كده
create or replace function submit_review(
  p_order_id uuid,
  p_rating int,
  p_comment text,
  p_customer_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_review_id uuid;
begin
  select * into v_order from orders where id = p_order_id;
  if v_order is null then
    raise exception 'order_not_found';
  end if;
  if v_order.status != 'delivered' then
    raise exception 'order_not_delivered';
  end if;
  if v_order.customer_phone != p_customer_phone then
    raise exception 'phone_mismatch';
  end if;
  if p_rating < 1 or p_rating > 5 then
    raise exception 'invalid_rating';
  end if;

  insert into reviews (order_id, restaurant_id, customer_id, rating, comment)
  values (p_order_id, v_order.restaurant_id, v_order.customer_id, p_rating, p_comment)
  on conflict (order_id) do nothing
  returning id into v_review_id;

  if v_review_id is null then
    raise exception 'already_reviewed';
  end if;

  -- تحديث متوسط تقييم المطعم وعدد المراجعات
  update restaurants r set
    rating = sub.avg_rating,
    reviews_count = sub.cnt
  from (
    select restaurant_id, round(avg(rating)::numeric, 1) as avg_rating, count(*) as cnt
    from reviews
    where restaurant_id = v_order.restaurant_id
    group by restaurant_id
  ) sub
  where r.id = sub.restaurant_id;

  return v_review_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) دعم البحث: فهرس نصي على اسم المطعم والوصف (بحث فوري بالعربي)
-- ----------------------------------------------------------------------------
create extension if not exists pg_trgm;

create index if not exists idx_restaurants_name_trgm
  on restaurants using gin (name gin_trgm_ops);

create index if not exists idx_menu_items_name_trgm
  on menu_items using gin (name_ar gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 5) دعم "الأقرب": إحداثيات اختيارية للمطعم (lat/lng) لحساب المسافة لاحقًا
-- ----------------------------------------------------------------------------
alter table restaurants
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- ----------------------------------------------------------------------------
-- 6) تتبع لحظي: تفعيل Realtime على orders (للعميل يشوف تحديث الحالة أوتوماتيك)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;
