-- ============================================================================
-- إضافة سجل آخر 20 توصيلة مكتملة لداشبورد الطيار (history)
-- ============================================================================
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'reference', o.reference,
    'delivery_fee_egp', o.delivery_fee_egp,
    'delivered_at', o.delivered_at,
    'restaurant_name', r.name
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
      'is_restaurant_rider', v_rider.restaurant_id is not null
    ),
    'active_orders', v_active,
    'history', v_history,
    'earnings', v_earnings
  );
end;
$$;
