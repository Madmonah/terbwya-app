import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseClient } from '@/lib/supabase';
import { Restaurant, CuisineCategory } from '@/lib/types';
import RestaurantsExplorer from './RestaurantsExplorer';

export const dynamic = 'force-dynamic';

async function getRestaurants(): Promise<Restaurant[]> {
  try {
    const supa = getSupabaseClient();
    const { data } = await supa
      .from('restaurants')
      .select('id,slug,name,description,city,district,cover_photo_url,rating,reviews_count,delivery_fee_egp,min_order_egp,avg_delivery_minutes,is_open,status,featured,cuisine_category_id,cuisine_category:cuisine_categories(slug,name_ar,icon)')
      .eq('status', 'published')
      .order('featured', { ascending: false });
    return (data as unknown as Restaurant[]) || [];
  } catch {
    return [];
  }
}

async function getCategories(): Promise<CuisineCategory[]> {
  try {
    const supa = getSupabaseClient();
    const { data } = await supa.from('cuisine_categories').select('*').order('display_order');
    return (data as CuisineCategory[]) || [];
  } catch {
    return [];
  }
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: { cuisine?: string };
}) {
  const [restaurants, categories] = await Promise.all([getRestaurants(), getCategories()]);

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-brand-ink mb-2">كل المطاعم</h1>
        <p className="text-brand-ink/60 mb-6">اختار مطعمك المفضل وابدأ الطلب</p>
        <RestaurantsExplorer restaurants={restaurants} categories={categories} initialCuisine={searchParams.cuisine || null} />
      </main>
      <Footer />
    </>
  );
}
