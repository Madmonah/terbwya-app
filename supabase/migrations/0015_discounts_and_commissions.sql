-- ============================================================================
-- ترباوية — خصومات المطاعم + عمولة المنصة الديناميكية
-- (النسخة الكاملة متطبقة على قاعدة البيانات — الملف ده مرجع للريبو)
-- الخصم: المطعم بيحدده بنفسه: discount_percent (0-90) + discount_ends_at اختياري
-- العمولة: commission_percent (0-50) لكل مطعم — الأدمن بس (trigger بيمنع غيره)
-- كل طلب بياخد snapshot من النسبتين وقت إنشائه:
--   discount_egp = subtotal * discount%  (لو الخصم نشط)
--   commission_egp = (subtotal - discount) * commission%
--   total = (subtotal - discount) + delivery_fee
-- والحد الأدنى للطلب بيتحسب على السعر قبل الخصم
-- راجع تفاصيل الدوال المحدثة (create_order و get_order_by_reference) في
-- الـ migration المطبق باسم discounts_and_commissions على Supabase.
-- ============================================================================

alter table restaurants
  add column if not exists discount_percent numeric(5,2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 90),
  add column if not exists discount_ends_at timestamptz,
  add column if not exists commission_percent numeric(5,2) not null default 0
    check (commission_percent >= 0 and commission_percent <= 50);

alter table orders
  add column if not exists discount_percent numeric(5,2) not null default 0,
  add column if not exists discount_egp numeric(10,2) not null default 0,
  add column if not exists commission_percent numeric(5,2) not null default 0,
  add column if not exists commission_egp numeric(10,2) not null default 0;

create or replace function protect_restaurant_commission()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and NEW.commission_percent is distinct from OLD.commission_percent then
    raise exception 'commission_admin_only';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_protect_commission on restaurants;
create trigger trg_protect_commission
  before update on restaurants
  for each row execute function protect_restaurant_commission();
