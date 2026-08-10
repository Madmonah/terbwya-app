import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseClient } from '@/lib/supabase';
import { Restaurant, CuisineCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getFeaturedRestaurants(): Promise<Restaurant[]> {
  try {
    const supa = getSupabaseClient();
    const { data } = await supa
      .from('restaurants')
      .select('id,slug,name,description,city,district,cover_photo_url,logo_url,rating,reviews_count,delivery_fee_egp,min_order_egp,avg_delivery_minutes,is_open,status,featured')
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(8);
    return (data as Restaurant[]) || [];
  } catch {
    return [];
  }
}

async function getCategories(): Promise<CuisineCategory[]> {
  try {
    const supa = getSupabaseClient();
    const { data } = await supa
      .from('cuisine_categories')
      .select('*')
      .order('display_order');
    return (data as CuisineCategory[]) || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [restaurants, categories] = await Promise.all([getFeaturedRestaurants(), getCategories()]);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-red to-brand-orange text-white">
          <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
              أحلى أكل، من أحسن مطاعم مصر 🍽️
            </h1>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              ترباوية بتجمعلك المطاعم اللي تستاهل — منيوهات حقيقية، أسعار واضحة، وطلب سهل من غير تعقيد.
            </p>
            <Link
              href="/restaurants"
              className="inline-block bg-white text-brand-red font-extrabold px-8 py-4 rounded-xl2 text-lg hover:bg-brand-cream transition-colors no-underline"
            >
              اتصفح المطاعم دلوقتي
            </Link>
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-10">
            <h2 className="text-xl font-bold text-brand-ink mb-4">اختار نوع الأكل</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/restaurants?cuisine=${c.slug}`}
                  className="flex items-center gap-3 bg-white border border-brand-amber/40 rounded-xl p-4 hover:border-brand-orange hover:shadow-md transition-all no-underline"
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="font-bold text-brand-ink">{c.name_ar}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured restaurants */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-brand-ink">مطاعم مميزة</h2>
            <Link href="/restaurants" className="text-brand-red font-bold text-sm hover:underline">
              شوف الكل ←
            </Link>
          </div>

          {restaurants.length === 0 ? (
            <div className="bg-white border border-dashed border-brand-amber rounded-xl p-10 text-center text-brand-ink/60">
              <p className="font-bold mb-1">لسه مفيش مطاعم منشورة</p>
              <p className="text-sm">هتظهر هنا فور ما تتم إضافة المطاعم الأولى لقاعدة البيانات.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    {r.city && <div className="text-xs text-brand-ink/50 mt-0.5">{r.city}</div>}
                    {r.rating && (
                      <div className="text-xs text-brand-orange font-bold mt-1">⭐ {r.rating.toFixed(1)}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CTA for restaurant owners */}
        <section className="bg-brand-amber/20 py-12 mt-6">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-extrabold text-brand-ink mb-3">عندك مطعم؟ انضم لترباوية</h2>
            <p className="text-brand-ink/70 mb-6">
              اعرض منيو مطعمك لآلاف العملاء، واستقبل طلبات مضمونة بسهولة.
            </p>
            <Link
              href="/join"
              className="inline-block bg-brand-red text-white font-extrabold px-6 py-3 rounded-xl hover:bg-brand-red-dark transition-colors no-underline"
            >
              سجّل مطعمك مجانًا
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
