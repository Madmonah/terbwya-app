-- ============================================================================
-- ترباوية — تخزين الصور (Supabase Storage)
-- باكت عام واحد لكل صور المطاعم والمنيو: restaurant-photos/{restaurant_id}/...
-- القراءة عامة (الصور المفروض تظهر لأي زائر)، الكتابة بس لصاحب المطعم على
-- مجلده الخاص (اسم أول جزء من المسار = restaurant_id)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('restaurant-photos', 'restaurant-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read restaurant photos bucket" on storage.objects;
create policy "public read restaurant photos bucket" on storage.objects
  for select using (bucket_id = 'restaurant-photos');

drop policy if exists "owner can upload to own restaurant folder" on storage.objects;
create policy "owner can upload to own restaurant folder" on storage.objects
  for insert with check (
    bucket_id = 'restaurant-photos'
    and is_restaurant_owner((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "owner can update own restaurant folder" on storage.objects;
create policy "owner can update own restaurant folder" on storage.objects
  for update using (
    bucket_id = 'restaurant-photos'
    and is_restaurant_owner((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "owner can delete own restaurant folder" on storage.objects;
create policy "owner can delete own restaurant folder" on storage.objects
  for delete using (
    bucket_id = 'restaurant-photos'
    and is_restaurant_owner((storage.foldername(name))[1]::uuid)
  );
