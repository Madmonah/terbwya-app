-- ============================================================================
-- إصلاح صفحة "طلباتي": العميل المسجل يقرا طلباته هو بس
-- (اتكسرت لما الـ policy العامة المفتوحة اتشالت في 0005 لأسباب أمنية)
-- ============================================================================
drop policy if exists "customer can read own orders" on orders;
create policy "customer can read own orders" on orders
  for select using (
    customer_id is not null and customer_id = current_customer_id()
  );

drop policy if exists "customer can read own order items" on order_items;
create policy "customer can read own order items" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id
        and o.customer_id is not null
        and o.customer_id = current_customer_id()
    )
  );
