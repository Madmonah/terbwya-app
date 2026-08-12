-- ============================================================================
-- ترباوية — تأمين قراءة الطلبات + دالة إنشاء طلب آمنة من السيرفر
-- المشكلة: كان فيه policy "public can read order by reference" بـ using(true)
-- يعني أي حد يقدر يقرا كل صفوف orders/order_items (مش بس اللي معاه رقم مرجعي)
-- عن طريق REST API مباشرة بمفتاح anon. الحل: نمسح الـ policy العامة دي خالص،
-- ونستبدلها بـ RPC آمن يتطلب reference + رقم تليفون العميل معًا (زي submit_review).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) مسح الـ policies العامة المفتوحة على orders/order_items
-- ----------------------------------------------------------------------------
drop policy if exists "public can read order by reference" on orders;
drop policy if exists "public can read order items" on order_items;

-- ملحوظة: "owner can read own orders" و"owner can read own order items" (من
-- migration 0003) بيفضلوا موجودين — أصحاب المطاعم لسه يقدروا يشوفوا طلبات
-- مطاعمهم عادي عن طريق الجلسة الموثقة بتاعتهم.

-- ----------------------------------------------------------------------------
-- 2) دالة آمنة لجلب طلب واحد بالرقم المرجعي + رقم تليفون العميل
--    (نفس نمط submit_review — تتحقق من تطابق البيانات قبل ما ترجع أي حاجة)
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
-- 3) دالة إنشاء طلب آمنة بالكامل من السيرفر: تتحقق من الأسعار من الداتابيز
--    نفسها (مش من الكلاينت)، من حالة المطعم (لازم يكون مفتوح ومنشور)، ومن
--    الحد الأدنى للطلب، وتحسب رسوم التوصيل الصح من بيانات المطعم.
--    بتستخدم COD بس حاليًا (المنصة دلوقتي كاش عند الاستلام فقط).
-- ----------------------------------------------------------------------------
create or replace function create_order(
  p_restaurant_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_city text,
  p_district text,
  p_notes text,
  p_items jsonb -- [{ "menu_item_id": uuid, "menu_size_id": uuid|null, "quantity": int }]
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

  -- إعادة حساب كل سطر من الداتابيز نفسها (تجاهل أي سعر جاي من الكلاينت)
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
    subtotal_egp, delivery_fee_egp, total_egp, notes
  ) values (
    p_restaurant_id, p_customer_id, nullif(trim(p_customer_name), ''), trim(p_customer_phone),
    nullif(trim(p_delivery_address), ''), nullif(trim(p_city), ''), nullif(trim(p_district), ''), 'cod',
    v_subtotal, coalesce(v_restaurant.delivery_fee_egp, 0), v_total, nullif(trim(p_notes), '')
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

-- السماح لأي حد (ضيف أو مسجل) بتنفيذ الدالتين دول بس — الجداول نفسها مقفولة
grant execute on function get_order_by_reference(text, text) to anon, authenticated;
grant execute on function create_order(uuid, uuid, text, text, text, text, text, text, jsonb) to anon, authenticated;
