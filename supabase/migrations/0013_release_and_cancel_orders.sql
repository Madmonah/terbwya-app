-- ============================================================================
-- ترباوية — تحرير الطلبات وإلغاؤها
-- 1) الطيار يحرر طلب قبله (قبل الاستلام من المطعم) فيرجع متاح للطيارين تاني
-- 2) العميل يلغي طلبه (قبل ما المطعم يبدأ التحضير) بنفس حماية reference+موبايل
-- 3) الطلب المتحرر بيرجع يتبعت له إشعار للطيارين المتاحين
-- ============================================================================

create or replace function rider_release_order(p_order_id uuid)
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
  if v_order.status not in ('confirmed','preparing') then
    raise exception 'cannot_release_after_pickup';
  end if;

  update orders set rider_id = null, updated_at = now() where id = p_order_id;
end;
$$;

create or replace function cancel_order_by_customer(
  p_reference text,
  p_customer_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  select * into v_order from orders where reference = p_reference;
  if v_order is null or v_order.customer_phone != p_customer_phone then
    raise exception 'order_not_found';
  end if;
  if v_order.status not in ('pending','confirmed') then
    raise exception 'cannot_cancel';
  end if;

  update orders set status = 'cancelled', updated_at = now() where id = v_order.id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function cancel_order_by_customer(text, text) to anon, authenticated;

create or replace function notify_push_rider_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    NEW.status = 'confirmed' and OLD.status is distinct from NEW.status and NEW.rider_id is null
  ) or (
    OLD.rider_id is not null and NEW.rider_id is null and NEW.status in ('confirmed','preparing')
  ) then
    perform net.http_post(
      url := 'https://terbwya.com/api/push/dispatch',
      body := jsonb_build_object('order_id', NEW.id, 'event', 'rider_available_order'),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return NEW;
end;
$$;
