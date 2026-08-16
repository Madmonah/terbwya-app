-- ============================================================================
-- "طلباتي" الحقيقية: طلبات الحساب + أي طلب بنفس رقم موبايل العميل (حتى كضيف)
-- + سماح للمستخدم المسجل يعمل/يحدّث صف العميل بتاعه (ربط السلة بالحساب)
-- النسخة الكاملة (دالة get_my_orders) متطبقة على Supabase باسم
-- customer_orders_by_phone.
-- ============================================================================
drop policy if exists "authenticated can create own customer row" on customers;
create policy "authenticated can create own customer row" on customers
  for insert with check (auth_user_id = auth.uid());

drop policy if exists "users can update own customer row" on customers;
create policy "users can update own customer row" on customers
  for update using (auth_user_id = auth.uid());
