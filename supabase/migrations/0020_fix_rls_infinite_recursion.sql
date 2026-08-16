-- ============================================================================
-- إصلاح حرج: حلقة مفرغة في سياسات orders ↔ riders
-- سياسة orders (الطيار يقرا طلباته) كانت بتعمل subquery على riders،
-- وسياسة riders (المطعم يشوف طيار طلباته — من 0012) بتعمل subquery على
-- orders → "infinite recursion detected in policy" على أي قراءة.
-- النتيجة: داشبورد المطعم مكنش بيعرض الطلبات، ودخول الطيار كان بيفشل.
-- الحل: كل العبور بين الجدولين عبر دوال SECURITY DEFINER (بتتخطى RLS داخليًا).
-- ============================================================================

drop policy if exists "rider can read assigned orders" on orders;
create policy "rider can read assigned orders" on orders
  for select using (
    rider_id is not null and rider_id = current_rider_id()
  );

drop policy if exists "rider can read assigned order items" on order_items;
create policy "rider can read assigned order items" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id and o.rider_id = current_rider_id()
    )
  );

create or replace function is_rider_on_my_orders(p_rider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from orders o
    where o.rider_id = p_rider_id
      and is_restaurant_owner(o.restaurant_id)
  );
$$;

drop policy if exists "owner can read riders on own orders" on riders;
create policy "owner can read riders on own orders" on riders
  for select using (is_rider_on_my_orders(id));
