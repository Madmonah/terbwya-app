-- ============================================================================
-- ترباوية (terbwya.com) — قاعدة بيانات مستقلة بالكامل عن مضمونة
-- Schema مبني على نفس نموذج المطاعم في مضمونة (كمرجع) لكن بدون أي اعتماد
-- على جداولها أو مفاتيحها الأجنبية. مصمم خصيصًا لمنصة طلب طعام من المطاعم.
-- ============================================================================

-- امتدادات أساسية
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1) الفئات (تصنيفات المطبخ: مشويات، بيتزا، حلويات، إلخ)
-- ----------------------------------------------------------------------------
create table if not exists cuisine_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_en text,
  icon text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2) أصحاب المطاعم (الموردين)
-- ----------------------------------------------------------------------------
create table if not exists restaurant_owners (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  business_name text not null,
  phone text,
  whatsapp_number text,
  logo_url text,
  kyc_status text not null default 'pending' check (kyc_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3) المطاعم (كل مطعم = listing مستقل)
-- ----------------------------------------------------------------------------
create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references restaurant_owners(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  cuisine_category_id uuid references cuisine_categories(id),
  city text,
  district text,
  address text,
  cover_photo_url text,
  logo_url text,
  rating numeric(2,1),
  reviews_count int not null default 0,
  delivery_fee_egp numeric(10,2) default 0,
  min_order_egp numeric(10,2) default 0,
  avg_delivery_minutes int,
  is_open boolean not null default true,
  status text not null default 'draft' check (status in ('draft','published','suspended')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_restaurants_status on restaurants(status);
create index if not exists idx_restaurants_city on restaurants(city);
create index if not exists idx_restaurants_cuisine on restaurants(cuisine_category_id);

-- ----------------------------------------------------------------------------
-- 4) صور إضافية للمطعم (جاليري)
-- ----------------------------------------------------------------------------
create table if not exists restaurant_photos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  url text not null,
  is_primary boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5) عناصر المنيو
-- ----------------------------------------------------------------------------
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category text, -- تصنيف داخل المنيو (مقبلات/أساسي/حلويات...)
  name_ar text not null,
  name_en text,
  description_ar text,
  description_en text,
  price numeric(10,2) not null,
  currency text not null default 'EGP',
  photo_url text,
  is_available boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_menu_items_restaurant on menu_items(restaurant_id);

-- ----------------------------------------------------------------------------
-- 6) أحجام/خيارات عنصر المنيو (صغير/وسط/كبير...)
-- ----------------------------------------------------------------------------
create table if not exists menu_item_sizes (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  name_ar text not null,
  price numeric(10,2) not null,
  is_available boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 7) العملاء (اختياري — يمكن الطلب كضيف برقم واتساب فقط في MVP)
-- ----------------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text,
  phone text,
  whatsapp_number text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 8) الطلبات
-- ----------------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  restaurant_id uuid not null references restaurants(id),
  customer_id uuid references customers(id),
  customer_name text,
  customer_phone text not null,
  delivery_address text,
  city text,
  district text,
  payment_method text not null default 'cod' check (payment_method in ('cod','instapay','vodafone_cash')),
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  subtotal_egp numeric(10,2) not null default 0,
  delivery_fee_egp numeric(10,2) not null default 0,
  total_egp numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_restaurant on orders(restaurant_id);
create index if not exists idx_orders_status on orders(status);

-- ----------------------------------------------------------------------------
-- 9) عناصر الطلب
-- ----------------------------------------------------------------------------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  menu_size_id uuid references menu_item_sizes(id),
  item_name text not null, -- snapshot من اسم الصنف وقت الطلب
  unit_price numeric(10,2) not null,
  quantity int not null default 1,
  line_total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS أساسي: القراءة العامة للمطاعم/المنيو المنشورة، الكتابة محمية
-- ----------------------------------------------------------------------------
alter table restaurants enable row level security;
alter table menu_items enable row level security;
alter table menu_item_sizes enable row level security;
alter table restaurant_photos enable row level security;
alter table cuisine_categories enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "public read published restaurants" on restaurants
  for select using (status = 'published');

create policy "public read menu of published restaurants" on menu_items
  for select using (
    exists (select 1 from restaurants r where r.id = restaurant_id and r.status = 'published')
  );

create policy "public read menu sizes" on menu_item_sizes
  for select using (
    exists (
      select 1 from menu_items mi
      join restaurants r on r.id = mi.restaurant_id
      where mi.id = menu_item_id and r.status = 'published'
    )
  );

create policy "public read restaurant photos" on restaurant_photos
  for select using (
    exists (select 1 from restaurants r where r.id = restaurant_id and r.status = 'published')
  );

create policy "public read cuisine categories" on cuisine_categories
  for select using (true);

-- الطلبات: إدخال عام مسموح (guest checkout)، القراءة محدودة (تُدار عبر service role في MVP)
create policy "public can create orders" on orders
  for insert with check (true);

create policy "public can create order items" on order_items
  for insert with check (true);

-- ----------------------------------------------------------------------------
-- بيانات أولية: تصنيفات المطبخ
-- (مطابقة لفئات المطاعم الفعلية في مضمونة categories.track='restaurants'،
--  عشان استيراد البيانات الحالية يبقى بدون أي تعديل يدوي في الفئات)
-- ----------------------------------------------------------------------------
insert into cuisine_categories (slug, name_ar, name_en, icon, display_order) values
  ('food-general',         'مطاعم متنوعة',            'General Food',        '🍽️', 1),
  ('food-egyptian',        'مأكولات شرقية ومصري',     'Egyptian & Oriental', '🥙', 2),
  ('food-grill',           'مشويات وجريل',            'Grills & BBQ',        '🍖', 3),
  ('food-bedouin',         'مأكولات بدوية',           'Bedouin Cuisine',     '🏜️', 4),
  ('food-seafood',         'مأكولات بحرية',           'Seafood',             '🦐', 5),
  ('food-burgers',         'برجر وسندوتشات',          'Burgers & Sandwiches','🍔', 6),
  ('food-pizza',           'بيتزا وإيطالي',           'Pizza & Italian',     '🍕', 7),
  ('food-asian',           'آسيوي وسوشي',             'Asian & Sushi',       '🍜', 8),
  ('food-healthy',         'صحي ودايت',               'Healthy & Diet',      '🥗', 9),
  ('food-cafe',            'كافيهات ومشروبات',        'Cafés & Drinks',      '☕', 10),
  ('food-specialty-coffee','سبيشيالتي كوفي',          'Specialty Coffee',    '☕', 11),
  ('food-fresh-juice',     'عصائر فريش',              'Fresh Juices',        '🧃', 12),
  ('food-desserts',        'حلويات ومخبوزات',         'Desserts & Bakery',   '🍰', 13)
on conflict (slug) do nothing;
