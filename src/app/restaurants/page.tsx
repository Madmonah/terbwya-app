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
  searchParams: { cuisine?: string; q?: string };
}) {
  const [restaurants, categories] = await Promise.all([getRestaurants(), getCategories()]);

  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-violet-800 via-violet-600 to-violet-400 text-white">
          <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full bg-black/10 blur-3xl" />
          <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-14">
            <h1 className="text-2xl md:text-3xl font-extrabold mb-2">كل المطاعم</h1>
            <p className="text-white/85">اختار مطعمك المفضل وابدأ الطلب</p>
          </div>
        </section>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <RestaurantsExplorer
            restaurants={restaurants}
            categories={categories}
            initialCuisine={searchParams.cuisine || null}
            initialQuery={searchParams.q || ''}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
