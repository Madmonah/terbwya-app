import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSearch from './HeroSearch';
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

async function getStats(): Promise<{ restaurantCount: number; cityCount: number; avgDelivery: number | null }> {
  try {
    const supa = getSupabaseClient();
    const { data, count } = await supa
      .from('restaurants')
      .select('city,avg_delivery_minutes', { count: 'exact' })
      .eq('status', 'published');

    const rows = (data as { city: string | null; avg_delivery_minutes: number | null }[]) || [];
    const cityCount = new Set(rows.map((r) => r.city).filter(Boolean)).size;
    const times = rows.map((r) => r.avg_delivery_minutes).filter((n): n is number => !!n);
    const avgDelivery = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

    return { restaurantCount: count || 0, cityCount, avgDelivery };
  } catch {
    return { restaurantCount: 0, cityCount: 0, avgDelivery: null };
  }
}

export default async function HomePage() {
  const [restaurants, categories, stats] = await Promise.all([
    getFeaturedRestaurants(),
    getCategories(),
    getStats(),
  ]);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-sky-800 via-sky-600 to-sky-400 text-white">
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 rounded-full bg-sky-900/20 blur-3xl" />
          <div className="pointer-events-none absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-sky-200/25 blur-2xl" />
          {/* subtle dot pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-28 text-center">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-xs md:text-sm font-bold mb-5">
              🔥 خصومات لحد ٥٠٪ كل يوم
            </span>

            <h1 className="text-3xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight">
              تعالى ادلعك بأقوى خصومات في مصر
            </h1>
            <p className="text-white/90 text-lg md:text-xl mb-9 max-w-2xl mx-auto">
              منيوهات حقيقية، أسعار واضحة، وطلب سهل من غير تعقيد.
            </p>

            <HeroSearch />

            {/* Stat pills */}
            <div className="mt-10 flex items-center justify-center gap-3 md:gap-4 flex-wrap">
              <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 min-w-[110px] hover:bg-white/20 transition-colors">
                <div className="text-xl md:text-2xl font-extrabold">
                  {stats.avgDelivery ? `${stats.avgDelivery} د` : '—'}
                </div>
                <div className="text-xs text-white/80 mt-0.5">متوسط التوصيل</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 min-w-[110px] hover:bg-white/20 transition-colors">
                <div className="text-xl md:text-2xl font-extrabold">
                  {stats.cityCount > 0 ? `${stats.cityCount}+` : '—'}
                </div>
                <div className="text-xs text-white/80 mt-0.5">مدينة</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 min-w-[110px] hover:bg-white/20 transition-colors">
                <div className="text-xl md:text-2xl font-extrabold">
                  {stats.restaurantCount > 0 ? `${stats.restaurantCount}+` : '—'}
                </div>
                <div className="text-xs text-white/80 mt-0.5">مطعم</div>
              </div>
            </div>
          </div>

          {/* wave divider */}
          <svg
            className="relative block w-full text-brand-cream"
            style={{ height: '40px' }}
            viewBox="0 0 1200 40"
            preserveAspectRatio="none"
          >
            <path d="M0,40 C300,0 900,0 1200,40 L1200,40 L0,40 Z" fill="currentColor" />
          </svg>
        </section>

        {/* Offers teaser */}
        <section className="max-w-6xl mx-auto px-4 -mt-2 md:-mt-4 relative z-10">
          <Link
            href="/offers"
            className="group flex items-center justify-between gap-4 bg-gradient-to-l from-sky-600 to-sky-400 text-white rounded-2xl px-5 py-4 md:px-8 md:py-5 shadow-lg shadow-sky-900/10 hover:shadow-xl hover:-translate-y-0.5 transition-all no-underline"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl md:text-3xl">🔥</span>
              <div>
                <div className="font-extrabold text-base md:text-lg">الدلع مستنيك</div>
                <div className="text-white/85 text-xs md:text-sm">عروض لفترة محدودة على أحلى المطاعم</div>
              </div>
            </div>
            <span className="shrink-0 bg-white/15 group-hover:bg-white/25 backdrop-blur-sm rounded-full px-4 py-2 text-xs md:text-sm font-bold transition-colors">
              شوف العروض ←
            </span>
          </Link>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-12 bg-brand-cream">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-brand-ink">اختار نوع الأكل</h2>
              <span className="text-brand-ink/40 text-sm hidden md:block">إيه اللي نفسك فيه النهاردة؟</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/restaurants?cuisine=${c.slug}`}
                  className="group flex items-center gap-3 bg-white border border-brand-amber/30 rounded-2xl p-4 hover:border-brand-orange hover:shadow-lg hover:shadow-brand-orange/10 hover:-translate-y-1 transition-all no-underline"
                >
                  <span className="flex items-center justify-center w-11 h-11 shrink-0 rounded-xl bg-brand-cream text-2xl group-hover:bg-brand-orange/10 group-hover:scale-110 transition-all">
                    {c.icon}
                  </span>
                  <span className="font-bold text-brand-ink">{c.name_ar}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured restaurants */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-brand-ink">مطاعم مميزة</h2>
              <p className="text-brand-ink/50 text-sm mt-0.5">مختارة بعناية عشانك</p>
            </div>
            <Link
              href="/restaurants"
              className="text-brand-red font-bold text-sm hover:underline shrink-0"
            >
              عرض الكل ←
            </Link>
          </div>

          {restaurants.length === 0 ? (
            <div className="bg-white border border-dashed border-brand-amber rounded-xl p-10 text-center text-brand-ink/60">
              <p className="font-bold mb-1">لسه مفيش مطاعم منشورة</p>
              <p className="text-sm">هتظهر هنا فور ما تتم إضافة المطاعم الأولى لقاعدة البيانات.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {restaurants.map((r, i) => (
                <Link
                  key={r.id}
                  href={`/restaurants/${r.slug}`}
                  className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all no-underline"
                >
                  <div className="relative aspect-[4/3] bg-brand-cream flex items-center justify-center overflow-hidden">
                    {r.cover_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.cover_photo_url}
                        alt={r.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-4xl">🍽️</span>
                    )}
                    {r.featured && (
                      <span className="absolute top-2 left-2 bg-brand-red text-white text-[10px] font-extrabold px-2 py-1 rounded-full shadow-sm">
                        {i % 2 === 0 ? 'خصم %20' : 'الأعلى تقييم'}
                      </span>
                    )}
                    {r.delivery_fee_egp != null && (
                      <span className="absolute top-2 right-2 bg-white/95 text-brand-red text-[11px] font-extrabold px-2 py-1 rounded-full shadow-sm">
                        {r.delivery_fee_egp === 0 ? 'توصيل مجاني' : `توصيل ${r.delivery_fee_egp} ج`}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-brand-ink text-sm leading-snug line-clamp-1">{r.name}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-brand-ink/50">
                      {r.city && <span>{r.city}</span>}
                      {r.avg_delivery_minutes && <span>· {r.avg_delivery_minutes} د</span>}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      {r.rating ? (
                        <span className="text-xs text-brand-orange font-bold">⭐ {r.rating.toFixed(1)}</span>
                      ) : <span />}
                      {r.min_order_egp != null && (
                        <span className="text-[11px] text-brand-ink/40">أقل طلب {r.min_order_egp} ج</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CTA for restaurant owners */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-amber/25 via-brand-cream to-brand-orange/15 py-14 mt-6">
          <div className="pointer-events-none absolute -top-8 right-10 w-40 h-40 rounded-full bg-brand-orange/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-10 w-52 h-52 rounded-full bg-brand-red/10 blur-3xl" />
          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <span className="inline-flex items-center gap-1.5 bg-white border border-brand-amber/40 rounded-full px-4 py-1.5 text-xs font-bold text-brand-ink/70 mb-4">
              🏪 لأصحاب المطاعم
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-brand-ink mb-3">عندك مطعم؟ انضم لترباوية</h2>
            <p className="text-brand-ink/70 mb-7 max-w-xl mx-auto">
              اعرض منيو مطعمك لآلاف العملاء، واستقبل طلبات مضمونة بسهولة وبدون عمولات مبالغ فيها.
            </p>
            <Link
              href="/join"
              className="inline-block bg-brand-red text-white font-extrabold px-8 py-3.5 rounded-xl hover:bg-brand-red-dark hover:shadow-lg hover:shadow-brand-red/20 hover:-translate-y-0.5 transition-all no-underline"
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
