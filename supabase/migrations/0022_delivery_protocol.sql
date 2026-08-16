-- ============================================================================
-- ترباوية — بروتوكول الدليفري
-- 1) كود تسليم PIN (4 أرقام) بيتولد مع كل طلب — الطيار لازم يدخله عشان يقفل الطلب
-- 2) مراحل تفصيلية بتوقيتاتها: وصلت المطعم → استلمت الطلب → في الطريق → تم التسليم
-- 3) تقييم الطيار من العميل بعد التسليم (+ متوسط التقييم على صف الطيار)
-- 4) بيانات وتسعير كاملة للطيار قبل قبول الطلب (أرباحه، COD، المسافة، الأصناف)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) أعمدة جديدة
-- ----------------------------------------------------------------------------
alter table orders
  add column if not exists delivery_pin text,
  add column if not exists arrived_at_restaurant_at timestamptz;

alter table riders
  add column if not exists rating numeric(3,2),
  add column if not exists ratings_count int not null default 0;

-- ----------------------------------------------------------------------------
-- 2) توليد كود التسليم تلقائيًا مع كل طلب جديد + تعبئة الطلبات النشطة الحالية
-- ----------------------------------------------------------------------------
create or replace function set_delivery_pin()
returns trigger
language plpgsql
as $$
begin
  if NEW.delivery_pin is null then
    NEW.delivery_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_set_delivery_pin on orders;
create trigger trg_set_delivery_pin
  before insert on orders
  for each row execute function set_delivery_pin();

update orders
  set delivery_pin = lpad((floor(random() * 10000))::int::text, 4, '0')
  where delivery_pin is null and status not in ('delivered','cancelled');

-- ----------------------------------------------------------------------------
-- 3) مراحل الطيار — بدل rider_update_order_status القديمة
--    'arrived'   → وصلت المطعم (سجل الوقت)
--    'picked_up' → استلمت الطلب (status = out_for_delivery)
--    'delivered' → تسليم، لازم PIN صحيح من العميل
-- ----------------------------------------------------------------------------
drop function if exists rider_update_order_status(uuid, text);

create or replace function rider_update_delivery_stage(
  p_order_id uuid,
  p_stage text,
  p_pin text default null
)
returns jsonb
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
  if not FOUND or v_order.rider_id is distinct from v_rider_id then
    raise exception 'not_your_order';
  end if;

  if p_stage = 'arrived' then
    if v_order.status not in ('confirmed','preparing') then
      raise exception 'invalid_transition';
    end if;
    update orders
      set arrived_at_restaurant_at = coalesce(arrived_at_restaurant_at, now()), updated_at = now()
      where id = p_order_id;

  elsif p_stage = 'picked_up' then
    if v_order.status not in ('confirmed','preparing') then
      raise exception 'invalid_transition';
    end if;
    update orders
      set status = 'out_for_delivery',
          arrived_at_restaurant_at = coalesce(arrived_at_restaurant_at, now()),
          picked_up_at = coalesce(picked_up_at, now()),
          updated_at = now()
      where id = p_order_id;

  elsif p_stage = 'delivered' then
    if v_order.status != 'out_for_delivery' then
      raise exception 'invalid_transition';
    end if;
    -- كود التسليم: العميل بيقوله للطيار عند الاستلام — يمنع "تم التسليم" الوهمي
    if v_order.delivery_pin is not null
       and (p_pin is null or trim(p_pin) != v_order.delivery_pin) then
      raise exception 'wrong_pin';
    end if;
    update orders
      set status = 'delivered', delivered_at = now(), updated_at = now()
      where id = p_order_id;

  else
    raise exception 'invalid_stage';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function rider_update_delivery_stage(uuid, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4) تقييم الطيار
-- ----------------------------------------------------------------------------
create table if not exists rider_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id) on delete cascade,
  rider_id uuid not null references riders(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rider_reviews_rider on rider_reviews(rider_id);

alter table rider_reviews enable row level security;

-- الطيار يشوف تقييماته، وصاحب المطعم يشوف تقييمات طياري طلباته
-- (كلها عن طريق دوال SECURITY DEFINER — مفيش subqueries خام بين جداول RLS)
drop policy if exists "rider reads own reviews" on rider_reviews;
create policy "rider reads own reviews" on rider_reviews
  for select using (rider_id = current_rider_id());

drop policy if exists "owner reads rider reviews on own orders" on rider_reviews;
create policy "owner reads rider reviews on own orders" on rider_reviews
  for select using (
    exists (select 1 from orders o where o.id = order_id and is_restaurant_owner(o.restaurant_id))
  );

-- العميل يقيّم عن طريق reference + رقم الموبايل (نفس بوابة التتبع — يشتغل للضيف كمان)
create or replace function rate_rider(
  p_reference text,
  p_customer_phone text,
  p_rating int,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'invalid_rating';
  end if;

  select * into v_order from orders where reference = p_reference;
  if not FOUND or v_order.customer_phone != p_customer_phone then
    raise exception 'order_not_found';
  end if;
  if v_order.status != 'delivered' then
    raise exception 'order_not_delivered';
  end if;
  if v_order.rider_id is null then
    raise exception 'no_rider_on_order';
  end if;

  insert into rider_reviews (order_id, rider_id, rating, comment)
  values (v_order.id, v_order.rider_id, p_rating, nullif(trim(p_comment), ''))
  on conflict (order_id) do update
    set rating = excluded.rating, comment = excluded.comment;

  update riders set
    rating = (select round(avg(rating)::numeric, 2) from rider_reviews where rider_id = v_order.rider_id),
    ratings_count = (select count(*) from rider_reviews where rider_id = v_order.rider_id),
    updated_at = now()
  where id = v_order.rider_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function rate_rider(text, text, int, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5) بيانات وتسعير كاملة قبل القبول: أرباح الطيار + COD + المسافة + الأصناف
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
  if not FOUND then
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
      'cod_amount_egp', o.total_egp,
      'earning_egp', o.delivery_fee_egp,
      'delivery_fee_egp', o.delivery_fee_egp,
      'city', o.city,
      'district', o.district,
      'delivery_address', o.delivery_address,
      'created_at', o.created_at,
      'items_count', (select coalesce(sum(oi.quantity), 0) from order_items oi where oi.order_id = o.id),
      'items_summary', (
        select string_agg(oi.item_name || ' ×' || oi.quantity, '، ')
        from order_items oi where oi.order_id = o.id
      ),
      'distance_km', (
        case
          when o.customer_lat is not null and o.customer_lng is not null
               and coalesce(o.pickup_lat, r.lat) is not null and coalesce(o.pickup_lng, r.lng) is not null
          then round((6371 * acos(least(1.0,
                 cos(radians(coalesce(o.pickup_lat, r.lat))) * cos(radians(o.customer_lat))
                 * cos(radians(o.customer_lng) - radians(coalesce(o.pickup_lng, r.lng)))
                 + sin(radians(coalesce(o.pickup_lat, r.lat))) * sin(radians(o.customer_lat))
               )))::numeric, 1)
          else null
        end
      ),
      'restaurant', jsonb_build_object(
        'name', coalesce(o.pickup_name, r.name),
        'address', coalesce(o.pickup_address, r.address),
        'city', r.city,
        'lat', coalesce(o.pickup_lat, r.lat),
        'lng', coalesce(o.pickup_lng, r.lng)
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
-- 6) داشبورد الطيار: توقيتات المراحل + تقييمه + تقييم كل طلب في السجل
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
  v_history jsonb;
  v_earnings jsonb;
begin
  select * into v_rider from riders where auth_user_id = auth.uid();
  if not FOUND then
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
    'arrived_at_restaurant_at', o.arrived_at_restaurant_at,
    'picked_up_at', o.picked_up_at,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object('item_name', oi.item_name, 'quantity', oi.quantity)), '[]'::jsonb)
      from order_items oi where oi.order_id = o.id
    ),
    'restaurant', jsonb_build_object(
      'name', coalesce(o.pickup_name, r.name),
      'address', coalesce(o.pickup_address, r.address),
      'city', r.city,
      'lat', coalesce(o.pickup_lat, r.lat),
      'lng', coalesce(o.pickup_lng, r.lng),
      'owner_phone', (select ow.phone from restaurant_owners ow where ow.id = r.owner_id)
    )
  ) order by o.created_at desc), '[]'::jsonb) into v_active
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.rider_id = v_rider.id
    and o.status in ('confirmed','preparing','out_for_delivery');

  select coalesce(jsonb_agg(jsonb_build_object(
    'reference', o.reference,
    'delivery_fee_egp', o.delivery_fee_egp,
    'delivered_at', o.delivered_at,
    'restaurant_name', r.name,
    'my_rating', (select rr.rating from rider_reviews rr where rr.order_id = o.id)
  ) order by o.delivered_at desc), '[]'::jsonb) into v_history
  from (
    select * from orders
    where rider_id = v_rider.id and status = 'delivered'
    order by delivered_at desc nulls last
    limit 20
  ) o
  join restaurants r on r.id = o.restaurant_id;

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
      'is_restaurant_rider', v_rider.restaurant_id is not null,
      'rating', v_rider.rating, 'ratings_count', v_rider.ratings_count
    ),
    'active_orders', v_active,
    'history', v_history,
    'earnings', v_earnings
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 7) تتبع العميل: كود التسليم + توقيتات المراحل + تقييم الطيار
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
  if not FOUND then
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
    'discount_percent', v_order.discount_percent,
    'discount_egp', v_order.discount_egp,
    'delivery_fee_egp', v_order.delivery_fee_egp,
    'total_egp', v_order.total_egp,
    'notes', v_order.notes,
    'created_at', v_order.created_at,
    'delivery_pin', case when v_order.status not in ('delivered','cancelled') then v_order.delivery_pin else null end,
    'arrived_at_restaurant_at', v_order.arrived_at_restaurant_at,
    'picked_up_at', v_order.picked_up_at,
    'delivered_at', v_order.delivered_at,
    'restaurant', (
      select jsonb_build_object(
        'name', r.name, 'slug', r.slug, 'logo_url', r.logo_url,
        'lat', r.lat, 'lng', r.lng, 'address', r.address, 'city', r.city
      ) from restaurants r where r.id = v_order.restaurant_id
    ),
    'rider', (
      select jsonb_build_object(
        'name', rd.name, 'phone', rd.phone, 'vehicle_type', rd.vehicle_type,
        'rating', rd.rating, 'ratings_count', rd.ratings_count
      )
      from riders rd where rd.id = v_order.rider_id
    ),
    'order_items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', oi.id, 'item_name', oi.item_name, 'quantity', oi.quantity, 'line_total', oi.line_total
      )), '[]'::jsonb)
      from order_items oi where oi.order_id = v_order.id
    ),
    'has_review', exists (select 1 from reviews rv where rv.order_id = v_order.id),
    'rider_review', (select jsonb_build_object('rating', rr.rating) from rider_reviews rr where rr.order_id = v_order.id)
  ) into v_result;

  return v_result;
end;
$$;
