import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseClient } from '@/lib/supabase';
import { Restaurant, MenuItem, activeDiscount, activeOffer, timeLeftLabel } from '@/lib/types';
import MenuList from './MenuList';
import FavoriteButton from './FavoriteButton';
import ReviewsSection from './ReviewsSection';
import StickyCartBar from './StickyCartBar';
import ShareButton from './ShareButton';

export const dynamic = 'force-dynamic';

// ميتاداتا لكل مطعم — عشان معاينة اللينك على واتساب/فيسبوك تطلع باسمه وصورته
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const restaurant = await getRestaurant(params.slug);
  if (!restaurant) {
    return { title: 'مطعم غير موجود — ترباوية' };
  }
  const discount = activeDiscount(restaurant);
  const title = `${restaurant.name}${discount > 0 ? ` — خصم ${discount}%` : ''} | ترباوية`;
  const description =
    restaurant.description ||
    `اطلب من ${restaurant.name}${restaurant.city ? ` في ${restaurant.city}` : ''} على ترباوية — توصيل سريع ودفع عند الاستلام.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ar_EG',
      images: restaurant.cover_photo_url ? [{ url: restaurant.cover_photo_url }] : undefined,
    },
    twitter: {
      card: restaurant.cover_photo_url ? 'summary_large_image' : 'summary',
      title,
      description,
    },
  };
}

async function getRestaurant(slug: string): Promise<Restaurant | null> {
  try {
    const supa = getSupabaseClient();
    const { data } = await supa
      .from('restaurants')
      .select('id,slug,name,description,city,district,cover_photo_url,logo_url,rating,reviews_count,delivery_fee_egp,min_order_egp,avg_delivery_minutes,is_open,status,featured,offers:restaurant_offers(id,discount_percent,starts_at,ends_at),branches:restaurant_branches(id,name,city,district,address,is_open),cuisine_category:cuisine_categories(slug,name_ar,icon)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return (data as unknown as Restaurant) || null;
  } catch {
    return null;
  }
}

async function getMenu(restaurantId: string): Promise<MenuItem[]> {
  try {
    const supa = getSupabaseClient();
    const { data } = await supa
      .from('menu_items')
      .select('*, sizes:menu_item_sizes(*)')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('display_order');
    return (data as unknown as MenuItem[]) || [];
  } catch {
    return [];
  }
}

async function getReviews(restaurantId: string) {
  try {
    const supa = getSupabaseClient();
    const { data } = await supa
      .from('reviews')
      .select('id, rating, comment, owner_reply, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(20);
    return data || [];
  } catch {
    return [];
  }
}

export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  const restaurant = await getRestaurant(params.slug);
  if (!restaurant) notFound();

  const [menu, reviews] = await Promise.all([getMenu(restaurant.id), getReviews(restaurant.id)]);
  const offer = activeOffer(restaurant.offers);
  const discount = activeDiscount(restaurant);

  return (
    <>
      <Header />
      <main>
        <div className="relative h-48 md:h-64 bg-gradient-to-br from-violet-800 via-violet-600 to-violet-400 overflow-hidden">
          {restaurant.cover_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurant.cover_photo_url} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <>
              {/* غلاف افتراضي شيك بدل المربع الفاضي */}
              <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute bottom-0 right-10 w-56 h-56 rounded-full bg-black/10 blur-3xl" />
              <div className="absolute inset-0 flex items-center justify-center text-white/90">
                <div className="text-center">
                  <div className="text-5xl mb-2">{restaurant.cuisine_category?.icon || '🍽️'}</div>
                  <div className="font-black text-xl">{restaurant.name}</div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="max-w-4xl mx-auto px-4 -mt-10 relative">
          <div className="bg-white rounded-xl2 shadow-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-brand-ink">{restaurant.name}</h1>
                {restaurant.is_open ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">مفتوح</span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">مقفول دلوقتي</span>
                )}
                {offer && (
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-gradient-to-br from-violet-600 to-violet-800 text-white">
                    🏷️ خصم {discount}% · ⏳ {timeLeftLabel(offer.ends_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <ShareButton name={restaurant.name} />
                <FavoriteButton restaurantId={restaurant.id} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-brand-ink/60">
              {restaurant.city && <span>📍 {restaurant.city}{restaurant.district ? `، ${restaurant.district}` : ''}</span>}
              {restaurant.rating != null && <span className="text-brand-orange font-bold">⭐ {restaurant.rating.toFixed(1)} ({restaurant.reviews_count})</span>}
              {restaurant.avg_delivery_minutes && <span>🕒 {restaurant.avg_delivery_minutes} دقيقة</span>}
              {restaurant.min_order_egp ? <span>الحد الأدنى للطلب: {restaurant.min_order_egp} ج.م</span> : null}
            </div>
            {restaurant.description && <p className="text-brand-ink/70 mt-3 text-sm">{restaurant.description}</p>}

            {((restaurant as any).branches || []).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-xs font-bold text-brand-ink/60 mb-1.5">🏪 الفروع — طلبك بيتوصّل من أقرب فرع ليك:</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] bg-brand-cream text-brand-ink/70 px-2.5 py-1 rounded-full">
                    الرئيسي: {restaurant.district || restaurant.city}
                  </span>
                  {((restaurant as any).branches || []).map((b: any) => (
                    <span
                      key={b.id}
                      className={`text-[11px] px-2.5 py-1 rounded-full ${b.is_open ? 'bg-brand-cream text-brand-ink/70' : 'bg-gray-100 text-gray-400 line-through'}`}
                    >
                      {b.name}{b.district || b.city ? `: ${b.district || b.city}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!restaurant.is_open && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-center text-sm font-bold">
              المطعم مقفول دلوقتي — تقدر تتصفح المنيو بس مش هتقدر تطلب
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-xl font-bold text-brand-ink mb-4">المنيو</h2>
            {menu.length === 0 ? (
              <div className="bg-white border border-dashed border-brand-amber rounded-xl p-8 text-center text-brand-ink/60">
                المنيو مش متاح دلوقتي.
              </div>
            ) : (
              <MenuList items={menu} restaurantId={restaurant.id} restaurantName={restaurant.name} isOpen={restaurant.is_open} discountPercent={discount} />
            )}
          </div>

          <div className="mt-10 mb-24">
            <h2 className="text-xl font-bold text-brand-ink mb-4">تقييمات العملاء</h2>
            <ReviewsSection reviews={reviews} />
          </div>
        </div>
      </main>
      <StickyCartBar restaurantId={restaurant.id} />
      <Footer />
    </>
  );
}
