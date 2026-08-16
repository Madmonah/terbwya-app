-- ============================================================================
-- صاحب المطعم يشوف بيانات الطيار المتعيّن على طلبات مطعمه (حتى لو طيار منصة)
-- ============================================================================
drop policy if exists "owner can read riders on own orders" on riders;
create policy "owner can read riders on own orders" on riders
  for select using (
    exists (
      select 1 from orders o
      where o.rider_id = riders.id and is_restaurant_owner(o.restaurant_id)
    )
  );
