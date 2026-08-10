import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { Restaurant, CuisineCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getRestaurants(cuisineSlug?: string): Promise<Restaurant[]> {
  try {
    const supa = getSupabaseClient();
    let query = supa
      .from('restaurants')
      .select('id,slug,name,description,city,district,cover_photo_url,rating,reviews_count,delivery_fee_egp,min_order_egp,avg_delivery_minutes,is_open,status,featured,cuisine_category_id,cuisine_category:cuisine_categories(slug,name_ar,icon)')
      .eq('status', 'published')
      .order('featured', { ascending: false });

    if (cuisineSlug) {
      const { data: cat } = await supa.from('cuisine_categories').select('id').eq('slug', cuisineSlug).single();
      if (cat) query = query.eq('cuisine_category_id', cat.id);
    }

    const { data } = await query;
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
  const [restaurants, categories] = await Promise.all([
    getRestaurants(searchParams.cuisine),
    getCategories(),
  ]);

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-brand-ink mb-2">كل المطاعم</h1>
        <p className="text-brand-ink/60 mb-6">اختار مطعمك المفضل وابدأ الطلب</p>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          <Link
            href="/restaurants"
            className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm no-underline ${
              !searchParams.cuisine ? 'bg-brand-red text-white' : 'bg-white border border-brand-amber/40 text-brand-ink'
            }`}
          >
            الكل
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/restaurants?cuisine=${c.slug}`}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm no-underline ${
                searchParams.cuisine === c.slug ? 'bg-brand-red text-white' : 'bg-white border border-brand-amber/40 text-brand-ink'
              }`}
            >
              {c.icon} {c.name_ar}
            </Link>
          ))}
        </div>

        {restaurants.length === 0 ? (
          <div className="bg-white border border-dashed border-brand-amber rounded-xl p-10 text-center text-brand-ink/60">
            <p className="font-bold mb-1">مفيش مطاعم في القسم ده لسه</p>
            <p className="text-sm">جرّب قسم تاني أو ارجع الكل.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {restaurants.map((r) => (
              <Link
                key={r.id}
                href={`/restaurants/${r.slug}`}
                className="block bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all no-underline"
              >
                <div className="aspect-[4/3] bg-brand-cream flex items-center justify-center overflow-hidden">
                  {r.cover_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.cover_photo_url} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-4xl">🍽️</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-bold text-brand-ink text-sm leading-snug line-clamp-1">{r.name}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-brand-ink/50">
                    {r.city && <span>{r.city}</span>}
                    {r.avg_delivery_minutes && <span>· {r.avg_delivery_minutes} د</span>}
                  </div>
                  {r.rating != null && (
                    <div className="text-xs text-brand-orange font-bold mt-1">⭐ {r.rating.toFixed(1)} ({r.reviews_count})</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
