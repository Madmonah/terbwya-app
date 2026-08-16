-- ============================================================================
-- ترباوية — موديل التوصيل (الطيارين)
-- أسطول منصة (restaurant_id = NULL) + طيارين خاصين بالمطاعم (restaurant_id محدد)
-- الطيار بيختار الطلب بنفسه (أول واحد يقبل ياخده — atomic)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) جدول الطيارين
-- ----------------------------------------------------------------------------
create table if not exists riders (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  restaurant_id uuid references restaurants(id) on delete set null, -- NULL = أسطول المنصة
  name text not null,
  phone text not null,
  email text,
  city text,
  vehicle_type text not null default 'motorcycle' check (vehicle_type in ('motorcycle','bicycle','car')),
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  is_online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_riders_auth_user on riders(auth_user_id) where auth_user_id is not null;
create index if not exists idx_riders_restaurant on riders(restaurant_id);
create index if not exists idx_riders_city on riders(city);

alter table riders enable row level security;

-- الطيار يشوف صفه بس (التعديلات الحساسة كلها عن طريق RPCs أو service role)
drop policy if exists "rider can read own row" on riders;
create policy "rider can read own row" on riders
  for select using (auth_user_id = auth.uid());

-- صاحب المطعم يشوف طياريه
drop policy if exists "owner can read own riders" on riders;
create policy "owner can read own riders" on riders
  for select using (restaurant_id is not null and is_restaurant_owner(restaurant_id));

-- ----------------------------------------------------------------------------
-- 2) أعمدة جديدة على الطلبات
-- ----------------------------------------------------------------------------
alter table orders
  add column if not exists rider_id uuid references riders(id) on delete set null,
  add column if not exists customer_lat double precision,
  add column if not exists customer_lng double precision,
  add column if not exists picked_up_at timestamptz,
  add column if not exists delivered_at timestamptz;

create index if not exists idx_orders_rider on orders(rider_id);

-- الطيار يقرا الطلبات المتعيّنة له (+ عناصرها)
drop policy if exists "rider can read assigned orders" on orders;
create policy "rider can read assigned orders" on orders
  for select using (
    rider_id is not null and rider_id = (select id from riders where auth_user_id = auth.uid())
  );

drop policy if exists "rider can read assigned order items" on order_items;
create policy "rider can read assigned order items" on order_items
  for select using (
    exists (
      select 1 from orders o
      join riders rd on rd.id = o.rider_id
      where o.id = order_id and rd.auth_user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3) دوال مساعدة
-- ----------------------------------------------------------------------------
create or replace function current_rider_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from riders where auth_user_id = auth.uid() limit 1;
$$;

-- تبديل حالة متاح/مشغول (بدل update مباشر على الجدول)
create or replace function set_rider_online(p_online boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider riders;
begin
  select * into v_rider from riders where auth_user_id = auth.uid();
  if v_rider is null then
    raise exception 'not_a_rider';
  end if;
  if v_rider.status != 'active' then
    raise exception 'rider_not_active';
  end if;
  update riders set is_online = p_online, updated_at = now() where id = v_rider.id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) الطلبات المتاحة للطيار الحالي
--    (مؤكدة أو بتتحضّر، مفيش طيار واخدها، وفي نطاقه: مطعمه لو طيار مطعم،
--     أو مدينته لو أسطول منصة)
-- ----------------------------------------------------------------------------
create or replace function get_available_orders_for_rider()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider riders;
  v_result jsonb;
begin
  select * into v_rider from riders where auth_user_id = auth.uid();
  if v_rider is null then
    raise exception 'not_a_rider';
  end if;
  if v_rider.status != 'active' then
    raise exception 'rider_not_active';
  end if;

  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'id', o.id,
      'reference', o.reference,
      'status', o.status,
      'total_egp', o.total_egp,
      'delivery_fee_egp', o.delivery_fee_egp,
      'city', o.city,
      'district', o.district,
      'delivery_address', o.delivery_address,
      'created_at', o.created_at,
      'restaurant', jsonb_build_object(
        'name', r.name, 'address', r.address, 'city', r.city,
        'lat', r.lat, 'lng', r.lng
      )
    ) as row_data,
    o.created_at
    from orders o
    join restaurants r on r.id = o.restaurant_id
    where o.rider_id is null
      and o.status in ('confirmed','preparing')
      and (
        (v_rider.restaurant_id is not null and o.restaurant_id = v_rider.restaurant_id)
        or
        (v_rider.restaurant_id is null and (v_rider.city is null or r.city = v_rider.city))
      )
    limit 20
  ) sub;

  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5) قبول طلب — atomic: أول طيار يقبل ياخد الطلب، الباقي يترفض
-- ----------------------------------------------------------------------------
create or replace function rider_accept_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider riders;
  v_updated orders;
begin
  select * into v_rider from riders where auth_user_id = auth.uid();
  if v_rider is null then
    raise exception 'not_a_rider';
  end if;
  if v_rider.status != 'active' then
    raise exception 'rider_not_active';
  end if;

  update orders
    set rider_id = v_rider.id, updated_at = now()
    where id = p_order_id
      and rider_id is null
      and status in ('confirmed','preparing')
    returning * into v_updated;

  if v_updated is null then
    raise exception 'order_already_taken';
  end if;

  return jsonb_build_object('ok', true, 'order_id', v_updated.id, 'reference', v_updated.reference);
end;
$$;

-- ----------------------------------------------------------------------------
-- 6) الطيار يحدّث حالة طلبه: استلمت من المطعم / تم التسليم
-- ----------------------------------------------------------------------------
create or replace function rider_update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider_id uuid;
  v_order orders;
begin
  v_rider_id := current_rider_id();
  if v_rider_id is null then
    raise exception 'not_a_rider';
  end if;

  select * into v_order from orders where id = p_order_id;
  if v_order is null or v_order.rider_id is distinct from v_rider_id then
    raise exception 'not_your_order';
  end if;

  if p_status = 'out_for_delivery' then
    if v_order.status not in ('confirmed','preparing') then
      raise exception 'invalid_transition';
    end if;
    update orders set status = 'out_for_delivery', picked_up_at = now(), updated_at = now() where id = p_order_id;
  elsif p_status = 'delivered' then
    if v_order.status != 'out_for_delivery' then
      raise exception 'invalid_transition';
    end if;
    update orders set status = 'delivered', delivered_at = now(), updated_at = now() where id = p_order_id;
  else
    raise exception 'invalid_status';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7) طلباتي وأرباحي (للطيار)
-- ----------------------------------------------------------------------------
create or replace function get_my_rider_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider riders;
  v_active jsonb;
  v_earnings jsonb;
begin
  select * into v_rider from riders where auth_user_id = auth.uid();
  if v_rider is null then
    raise exception 'not_a_rider';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'reference', o.reference,
    'status', o.status,
    'total_egp', o.total_egp,
    'delivery_fee_egp', o.delivery_fee_egp,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'delivery_address', o.delivery_address,
    'city', o.city,
    'district', o.district,
    'customer_lat', o.customer_lat,
    'customer_lng', o.customer_lng,
    'notes', o.notes,
    'created_at', o.created_at,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object('item_name', oi.item_name, 'quantity', oi.quantity)), '[]'::jsonb)
      from order_items oi where oi.order_id = o.id
    ),
    'restaurant', jsonb_build_object(
      'name', r.name, 'address', r.address, 'city', r.city, 'lat', r.lat, 'lng', r.lng,
      'owner_phone', (select ow.phone from restaurant_owners ow where ow.id = r.owner_id)
    )
  ) order by o.created_at desc), '[]'::jsonb) into v_active
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.rider_id = v_rider.id
    and o.status in ('confirmed','preparing','out_for_delivery');

  select jsonb_build_object(
    'today_egp', coalesce(sum(delivery_fee_egp) filter (where delivered_at >= date_trunc('day', now())), 0),
    'total_egp', coalesce(sum(delivery_fee_egp), 0),
    'delivered_count', count(*)
  ) into v_earnings
  from orders
  where rider_id = v_rider.id and status = 'delivered';

  return jsonb_build_object(
    'rider', jsonb_build_object(
      'id', v_rider.id, 'name', v_rider.name, 'status', v_rider.status,
      'is_online', v_rider.is_online, 'city', v_rider.city,
      'is_restaurant_rider', v_rider.restaurant_id is not null
    ),
    'active_orders', v_active,
    'earnings', v_earnings
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 8) تحديث create_order: إحداثيات العميل إجبارية (GPS) + الحي والملاحظات
--    (drop الأول عشان تغيير التوقيع مايعملش overload غامض)
-- ----------------------------------------------------------------------------
drop function if exists create_order(uuid, uuid, text, text, text, text, text, text, jsonb);

create or replace function create_order(
  p_restaurant_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_city text,
  p_district text,
  p_notes text,
  p_items jsonb,
  p_customer_lat double precision default null,
  p_customer_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant record;
  v_item jsonb;
  v_menu_item record;
  v_size record;
  v_unit_price numeric(10,2);
  v_item_name text;
  v_quantity int;
  v_subtotal numeric(10,2) := 0;
  v_total numeric(10,2);
  v_order_id uuid;
  v_reference text;
  v_line_items jsonb[] := '{}';
begin
  if p_customer_phone is null or length(trim(p_customer_phone)) < 6 then
    raise exception 'invalid_phone';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;
  -- GPS إجباري: التوصيل محتاج موقع حقيقي
  if p_customer_lat is null or p_customer_lng is null then
    raise exception 'location_required';
  end if;

  select * into v_restaurant from restaurants where id = p_restaurant_id;
  if v_restaurant is null then
    raise exception 'restaurant_not_found';
  end if;
  if v_restaurant.status != 'published' then
    raise exception 'restaurant_not_published';
  end if;
  if not v_restaurant.is_open then
    raise exception 'restaurant_closed';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_menu_item
      from menu_items
      where id = (v_item->>'menu_item_id')::uuid
        and restaurant_id = p_restaurant_id;
    if v_menu_item is null then
      raise exception 'menu_item_not_found';
    end if;
    if not v_menu_item.is_available then
      raise exception 'menu_item_unavailable';
    end if;

    v_quantity := coalesce((v_item->>'quantity')::int, 0);
    if v_quantity < 1 or v_quantity > 50 then
      raise exception 'invalid_quantity';
    end if;

    if v_item->>'menu_size_id' is not null then
      select * into v_size
        from menu_item_sizes
        where id = (v_item->>'menu_size_id')::uuid
          and menu_item_id = v_menu_item.id;
      if v_size is null then
        raise exception 'menu_size_not_found';
      end if;
      if not v_size.is_available then
        raise exception 'menu_size_unavailable';
      end if;
      v_unit_price := v_size.price;
      v_item_name := v_menu_item.name_ar || ' - ' || v_size.name_ar;
    else
      v_unit_price := v_menu_item.price;
      v_item_name := v_menu_item.name_ar;
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    v_line_items := v_line_items || jsonb_build_object(
      'menu_item_id', v_menu_item.id,
      'menu_size_id', case when v_item->>'menu_size_id' is not null then (v_item->>'menu_size_id')::uuid else null end,
      'item_name', v_item_name,
      'unit_price', v_unit_price,
      'quantity', v_quantity,
      'line_total', v_unit_price * v_quantity
    );
  end loop;

  if v_subtotal < coalesce(v_restaurant.min_order_egp, 0) then
    raise exception 'below_minimum_order';
  end if;

  v_total := v_subtotal + coalesce(v_restaurant.delivery_fee_egp, 0);

  insert into orders (
    restaurant_id, customer_id, customer_name, customer_phone,
    delivery_address, city, district, payment_method,
    subtotal_egp, delivery_fee_egp, total_egp, notes,
    customer_lat, customer_lng
  ) values (
    p_restaurant_id, p_customer_id, nullif(trim(p_customer_name), ''), trim(p_customer_phone),
    nullif(trim(p_delivery_address), ''), nullif(trim(p_city), ''), nullif(trim(p_district), ''), 'cod',
    v_subtotal, coalesce(v_restaurant.delivery_fee_egp, 0), v_total, nullif(trim(p_notes), ''),
    p_customer_lat, p_customer_lng
  )
  returning id, reference into v_order_id, v_reference;

  insert into order_items (order_id, menu_item_id, menu_size_id, item_name, unit_price, quantity, line_total)
  select v_order_id, (li->>'menu_item_id')::uuid,
         case when li->>'menu_size_id' is not null then (li->>'menu_size_id')::uuid else null end,
         li->>'item_name', (li->>'unit_price')::numeric, (li->>'quantity')::int, (li->>'line_total')::numeric
  from unnest(v_line_items) as li;

  return jsonb_build_object('id', v_order_id, 'reference', v_reference, 'total_egp', v_total);
end;
$$;

grant execute on function create_order(uuid, uuid, text, text, text, text, text, text, jsonb, double precision, double precision) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 9) تحديث get_order_by_reference: إضافة بيانات الطيار للعميل
-- ----------------------------------------------------------------------------
create or replace function get_order_by_reference(
  p_reference text,
  p_customer_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_result jsonb;
begin
  select * into v_order from orders where reference = p_reference;
  if v_order is null then
    return null;
  end if;
  if v_order.customer_phone != p_customer_phone then
    return null;
  end if;

  select jsonb_build_object(
    'id', v_order.id,
    'reference', v_order.reference,
    'status', v_order.status,
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'delivery_address', v_order.delivery_address,
    'city', v_order.city,
    'district', v_order.district,
    'payment_method', v_order.payment_method,
    'subtotal_egp', v_order.subtotal_egp,
    'delivery_fee_egp', v_order.delivery_fee_egp,
    'total_egp', v_order.total_egp,
    'notes', v_order.notes,
    'created_at', v_order.created_at,
    'restaurant', (
      select jsonb_build_object(
        'name', r.name, 'slug', r.slug, 'logo_url', r.logo_url,
        'lat', r.lat, 'lng', r.lng, 'address', r.address, 'city', r.city
      ) from restaurants r where r.id = v_order.restaurant_id
    ),
    'rider', (
      select jsonb_build_object('name', rd.name, 'phone', rd.phone, 'vehicle_type', rd.vehicle_type)
      from riders rd where rd.id = v_order.rider_id
    ),
    'order_items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', oi.id, 'item_name', oi.item_name, 'quantity', oi.quantity, 'line_total', oi.line_total
      )), '[]'::jsonb)
      from order_items oi where oi.order_id = v_order.id
    ),
    'has_review', exists (select 1 from reviews rv where rv.order_id = v_order.id)
  ) into v_result;

  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- 10) اشتراكات push للطيارين
-- ----------------------------------------------------------------------------
alter table push_subscriptions
  drop constraint if exists push_subscriptions_kind_check;
alter table push_subscriptions
  add constraint push_subscriptions_kind_check check (kind in ('owner','customer','rider'));

alter table push_subscriptions
  add column if not exists rider_id uuid references riders(id) on delete cascade;

create index if not exists idx_push_subs_rider on push_subscriptions(rider_id);

drop policy if exists "rider manage own push subs" on push_subscriptions;
create policy "rider manage own push subs" on push_subscriptions
  for all using (
    kind = 'rider' and rider_id is not null and rider_id = current_rider_id()
  )
  with check (
    kind = 'rider' and rider_id is not null and rider_id = current_rider_id()
  );

-- ----------------------------------------------------------------------------
-- 11) trigger إضافي: أول ما طلب يتأكد (أو طيار يقبله) نبلّغ dispatch
-- ----------------------------------------------------------------------------
create or replace function notify_push_rider_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- طلب اتأكد ولسه مفيش طيار → إشعار للطيارين المتاحين
  if NEW.status = 'confirmed' and OLD.status is distinct from NEW.status and NEW.rider_id is null then
    perform net.http_post(
      url := 'https://terbwya.com/api/push/dispatch',
      body := jsonb_build_object('order_id', NEW.id, 'event', 'rider_available_order'),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_push_rider_events on orders;
create trigger trg_push_rider_events
  after update on orders
  for each row execute function notify_push_rider_events();
