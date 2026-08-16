-- ============================================================================
-- ترباوية — عمولة المنصة من الدليفري
-- مبلغ ثابت لكل طلب يتسلم، دينامك من الداتا بيز لكل طيار (الإدارة بس اللي
-- تحدده)، وبيتطبق على أسطول ترباوية بس — طيارين المطاعم الخاصين من غير عمولة.
-- بيتسجل snapshot على الطلب لحظة التسليم (زي عمولة المطاعم بالظبط).
-- ============================================================================

alter table riders
  add column if not exists commission_per_order_egp numeric(10,2) not null default 5
    check (commission_per_order_egp >= 0);

alter table orders
  add column if not exists rider_commission_egp numeric(10,2) not null default 0;

-- ----------------------------------------------------------------------------
-- التسليم بيسجل عمولة المنصة snapshot (أسطول المنصة بس، ومش بتزيد عن رسوم التوصيل)
-- ----------------------------------------------------------------------------
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
  v_rider riders;
  v_order orders;
  v_commission numeric(10,2);
begin
  select * into v_rider from riders where auth_user_id = auth.uid();
  if not FOUND then
    raise exception 'not_a_rider';
  end if;

  select * into v_order from orders where id = p_order_id;
  if not FOUND or v_order.rider_id is distinct from v_rider.id then
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
    if v_order.delivery_pin is not null
       and (p_pin is null or trim(p_pin) != v_order.delivery_pin) then
      raise exception 'wrong_pin';
    end if;

    -- عمولة المنصة: أسطول ترباوية بس (طيار المطعم الخاص = صفر)
    if v_rider.restaurant_id is null then
      v_commission := least(coalesce(v_rider.commission_per_order_egp, 0), coalesce(v_order.delivery_fee_egp, 0));
    else
      v_commission := 0;
    end if;

    update orders
      set status = 'delivered',
          delivered_at = now(),
          rider_commission_egp = v_commission,
          updated_at = now()
      where id = p_order_id;

  else
    raise exception 'invalid_stage';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- شفافية كاملة للطيار: أرباحه الصافية (بعد عمولة المنصة) قبل القبول وبعده
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
  v_comm numeric(10,2);
begin
  select * into v_rider from riders where auth_user_id = auth.uid();
  if not FOUND then
    raise exception 'not_a_rider';
  end if;
  if v_rider.status != 'active' then
    raise exception 'rider_not_active';
  end if;

  v_comm := case when v_rider.restaurant_id is null then coalesce(v_rider.commission_per_order_egp, 0) else 0 end;

  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'id', o.id,
      'reference', o.reference,
      'status', o.status,
      'total_egp', o.total_egp,
      'cod_amount_egp', o.total_egp,
      'earning_egp', greatest(coalesce(o.delivery_fee_egp, 0) - v_comm, 0),
      'platform_commission_egp', least(v_comm, coalesce(o.delivery_fee_egp, 0)),
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
-- داشبورد الطيار: الأرباح صافي (بعد عمولة المنصة) + العمولة ظاهرة بوضوح
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
    'net_earning_egp', greatest(
      coalesce(o.delivery_fee_egp, 0)
      - (case when v_rider.restaurant_id is null then least(coalesce(v_rider.commission_per_order_egp, 0), coalesce(o.delivery_fee_egp, 0)) else 0 end),
      0
    ),
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
    'net_earning_egp', greatest(coalesce(o.delivery_fee_egp, 0) - coalesce(o.rider_commission_egp, 0), 0),
    'platform_commission_egp', coalesce(o.rider_commission_egp, 0),
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
    'today_egp', coalesce(sum(greatest(coalesce(delivery_fee_egp, 0) - coalesce(rider_commission_egp, 0), 0)) filter (where delivered_at >= date_trunc('day', now())), 0),
    'total_egp', coalesce(sum(greatest(coalesce(delivery_fee_egp, 0) - coalesce(rider_commission_egp, 0), 0)), 0),
    'platform_commission_total_egp', coalesce(sum(rider_commission_egp), 0),
    'delivered_count', count(*)
  ) into v_earnings
  from orders
  where rider_id = v_rider.id and status = 'delivered';

  return jsonb_build_object(
    'rider', jsonb_build_object(
      'id', v_rider.id, 'name', v_rider.name, 'status', v_rider.status,
      'is_online', v_rider.is_online, 'city', v_rider.city,
      'is_restaurant_rider', v_rider.restaurant_id is not null,
      'rating', v_rider.rating, 'ratings_count', v_rider.ratings_count,
      'commission_per_order_egp', case when v_rider.restaurant_id is null then v_rider.commission_per_order_egp else 0 end
    ),
    'active_orders', v_active,
    'history', v_history,
    'earnings', v_earnings
  );
end;
$$;
