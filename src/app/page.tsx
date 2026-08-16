import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSearch from './HeroSearch';
import { getSupabaseClient } from '@/lib/supabase';
import { Restaurant, CuisineCategory, activeOffer, timeLeftLabel } from '@/lib/types';

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

async function getActiveOfferRestaurants(): Promise<Restaurant[]> {
  try {
    const supa = getSupabaseClient();
    const { data } = await supa
      .from('restaurants')
      .select('id,slug,name,city,cover_photo_url,rating,reviews_count,avg_delivery_minutes,is_open,status,featured,offers:restaurant_offers!inner(id,discount_percent,starts_at,ends_at)')
      .eq('status', 'published')
      .limit(20);
    return ((data as unknown as Restaurant[]) || [])
      .filter((r) => activeOffer(r.offers) !== null)
      .sort((a, b) => Number(activeOffer(b.offers)!.discount_percent) - Number(activeOffer(a.offers)!.discount_percent))
      .slice(0, 8);
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
  const [restaurants, categories, offerRestaurants] = await Promise.all([
    getFeaturedRestaurants(),
    getCategories(),
    getActiveOfferRestaurants(),
  ]);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden text-white">
          {/* photo background */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/founder.jpeg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          {/* purple gradient overlay for legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-violet-950/90 via-violet-900/75 to-violet-950/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 rounded-full bg-violet-900/30 blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-4 pt-4 md:pt-6">
            <div className="flex justify-end">
              <HeroSearch />
            </div>
          </div>

          <div className="relative max-w-6xl mx-auto px-4 pb-16 md:pb-28 pt-6 md:pt-10 text-center">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-xs md:text-sm font-bold mb-5">
              🔥 خصومات لحد ٥٠٪ كل يوم
            </span>

            <h1 className="text-3xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight">
              تعالى ادلعك بأقوى خصومات في مصر
            </h1>
            <p className="text-white/90 text-lg md:text-xl mb-9 max-w-2xl mx-auto">
              منيوهات حقيقية، أسعار واضحة، وطلب سهل من غير تعقيد.
            </p>
          </div>

          {/* wave divider */}
          <svg
            className="relative block w-full text-white"
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
            className="group flex items-center justify-between gap-4 bg-gradient-to-l from-violet-500 via-violet-600 to-violet-700 text-white rounded-2xl px-5 py-4 md:px-8 md:py-5 shadow-lg shadow-violet-900/10 hover:shadow-xl hover:-translate-y-0.5 transition-all no-underline"
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

        {/* Verticals — بطاقات صور كبيرة */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-xl md:text-2xl font-extrabold text-brand-ink mb-5">اختار قسمك</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            <Link
              href="/restaurants"
              className="group relative overflow-hidden rounded-2xl aspect-[4/3] md:aspect-[3/4] no-underline shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/hero-restaurants.jpg"
                alt="المطاعم"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-950/20 to-transparent" />
              <div className="relative h-full flex flex-col justify-end p-5 text-white">
                <span className="text-3xl mb-1">🍽️</span>
                <span className="text-xl font-extrabold">المطاعم</span>
                <span className="text-white/80 text-sm mt-0.5">اطلب من أحلى المطاعم القريبة منك</span>
              </div>
            </Link>

            <Link
              href="/pharmacies"
              className="group relative overflow-hidden rounded-2xl aspect-[4/3] md:aspect-[3/4] no-underline shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/hero-pharmacy.jpg"
                alt="الصيدليات"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-950/20 to-transparent" />
              <span className="absolute top-4 left-4 bg-white/90 text-brand-red text-[11px] font-extrabold px-3 py-1 rounded-full">
                قريبًا
              </span>
              <div className="relative h-full flex flex-col justify-end p-5 text-white">
                <span className="text-3xl mb-1">💊</span>
                <span className="text-xl font-extrabold">الصيدليات</span>
                <span className="text-white/80 text-sm mt-0.5">أدويتك ومستلزماتك في دقايق</span>
              </div>
            </Link>

            <Link
              href="/supermarket"
              className="group relative overflow-hidden rounded-2xl aspect-[4/3] md:aspect-[3/4] no-underline shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/hero-supermarket.jpg"
                alt="سوبر ماركت"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-950/20 to-transparent" />
              <span className="absolute top-4 left-4 bg-white/90 text-brand-red text-[11px] font-extrabold px-3 py-1 rounded-full">
                قريبًا
              </span>
              <div className="relative h-full flex flex-col justify-end p-5 text-white">
                <span className="text-3xl mb-1">🛒</span>
                <span className="text-xl font-extrabold">سوبر ماركت</span>
                <span className="text-white/80 text-sm mt-0.5">احتياجات بيتك اليومية بضغطة</span>
              </div>
            </Link>
          </div>
        </section>

        {/* عروض النهارده — بتظهر بس لو فيه عروض نشطة فعلاً */}
        {offerRestaurants.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-brand-ink">🔥 عروض النهارده</h2>
              <Link href="/offers" className="text-brand-red font-bold text-sm hover:underline no-underline">
                شوف كل العروض ←
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {offerRestaurants.map((r) => {
                const offer = activeOffer(r.offers)!;
                return (
                  <Link
                    key={r.id}
                    href={`/restaurants/${r.slug}`}
                    className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all no-underline"
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
                        <div className="w-full h-full bg-gradient-to-br from-violet-700 via-violet-500 to-violet-300 flex items-center justify-center">
                    <span className="text-4xl drop-shadow">{(r as any).cuisine_category?.icon || '🍽️'}</span>
                  </div>
                      )}
                      <span className="absolute top-2 right-2 bg-gradient-to-br from-violet-600 to-violet-800 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow">
                        خصم {Number(offer.discount_percent)}%
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="font-bold text-brand-ink text-sm leading-snug line-clamp-1">{r.name}</div>
                      <div className="text-[11px] text-brand-ink/50 mt-1">⏳ {timeLeftLabel(offer.ends_at)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-12 bg-white">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-brand-ink">اختار نوع الأكل</h2>
              <span className="text-brand-ink/40 text-sm hidden md:block">إيه اللي نفسك فيه النهاردة؟</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/restaurants?cuisine=${c.slug}`}
                  className="group flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-4 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-900/5 hover:-translate-y-1 transition-all no-underline"
                >
                  <span className="flex items-center justify-center w-11 h-11 shrink-0 rounded-xl bg-white text-2xl group-hover:bg-violet-50 group-hover:scale-110 transition-all">
                    {c.icon}
                  </span>
                  <span className="font-bold text-brand-ink">{c.name_ar}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured restaurants */}
        <section className="max-w-6xl mx-auto px-4 py-12 bg-gray-50">
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
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center text-brand-ink/60">
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
                      <div className="w-full h-full bg-gradient-to-br from-violet-700 via-violet-500 to-violet-300 flex items-center justify-center">
                    <span className="text-4xl drop-shadow">{(r as any).cuisine_category?.icon || '🍽️'}</span>
                  </div>
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
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-violet-50/40 py-14 mt-6">
          <div className="pointer-events-none absolute -top-8 right-10 w-40 h-40 rounded-full bg-violet-200/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-10 w-52 h-52 rounded-full bg-violet-300/10 blur-3xl" />
          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs font-bold text-brand-ink/70 mb-4">
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
