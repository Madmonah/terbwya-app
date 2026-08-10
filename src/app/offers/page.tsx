import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseClient } from '@/lib/supabase';
import { Restaurant } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getOfferRestaurants(): Promise<Restaurant[]> {
  try {
    const supa = getSupabaseClient();
    const { data } = await supa
      .from('restaurants')
      .select('id,slug,name,description,city,district,cover_photo_url,rating,reviews_count,delivery_fee_egp,min_order_egp,avg_delivery_minutes,is_open,status,featured')
      .eq('status', 'published')
      .eq('featured', true)
      .order('rating', { ascending: false, nullsFirst: false });
    return (data as Restaurant[]) || [];
  } catch {
    return [];
  }
}

const DISCOUNT_LABELS = ['خصم 20%', 'خصم 30%', 'توصيل مجاني', 'خصم 15%', 'اطلب واحد واحصل التاني مجانًا', 'خصم 25%'];

export default async function OffersPage() {
  const restaurants = await getOfferRestaurants();

  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-sky-500 to-sunset-400 text-white">
          <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full bg-black/10 blur-3xl" />
          <div className="pointer-events-none absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-sky-200/25 blur-2xl" />
          <div className="relative max-w-6xl mx-auto px-4 py-14 md:py-20 text-center">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-xs md:text-sm font-bold mb-5">
              ⏳ عروض لفترة محدودة
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight tracking-tight">
              الدلع مستنيك
            </h1>
            <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto">
              أقوى خصومات ترباوية على أحلى المطاعم، لفترة محدودة بس — خدها قبل ما تخلص.
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-10">
          {restaurants.length === 0 ? (
            <div className="bg-white border border-dashed border-brand-amber rounded-xl p-10 text-center text-brand-ink/60">
              <p className="font-bold mb-1">لسه مفيش عروض متاحة</p>
              <p className="text-sm">تابعنا هنا أول بأول — العروض بتتجدد باستمرار.</p>
            </div>
          ) : (
            <>
              <p className="text-brand-ink/50 text-sm mb-5">{restaurants.length} عرض متاح دلوقتي</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {restaurants.map((r, i) => (
                  <Link
                    key={r.id}
                    href={`/restaurants/${r.slug}`}
                    className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all no-underline"
                  >
                    <div className="relative aspect-[16/10] bg-brand-cream flex items-center justify-center overflow-hidden">
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
                      <span className="absolute top-3 right-3 bg-gradient-to-br from-sunset-400 to-violet-600 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-sm">
                        {DISCOUNT_LABELS[i % DISCOUNT_LABELS.length]}
                      </span>
                      <span className="absolute bottom-3 left-3 bg-brand-ink/80 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                        ⏳ لفترة محدودة
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="font-bold text-brand-ink leading-snug line-clamp-1">{r.name}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-brand-ink/50">
                        {r.city && <span>{r.city}</span>}
                        {r.avg_delivery_minutes && <span>· {r.avg_delivery_minutes} د</span>}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {r.rating ? (
                          <span className="text-xs text-sky-600 font-bold">⭐ {r.rating.toFixed(1)}</span>
                        ) : <span />}
                        {r.min_order_egp != null && (
                          <span className="text-[11px] text-brand-ink/40">أقل طلب {r.min_order_egp} ج</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
