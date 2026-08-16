import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseClient } from '@/lib/supabase';
import { Restaurant, MenuItem, activeDiscount, activeOffer, timeLeftLabel } from '@/lib/types';
import MenuList from './MenuList';
import FavoriteButton from './FavoriteButton';
import ReviewsSection from './ReviewsSection';

export const dynamic = 'force-dynamic';

async function getRestaurant(slug: string): Promise<Restaurant | null> {
  try {
    const supa = getSupabaseClient();
    const { data } = await supa
      .from('restaurants')
      .select('id,slug,name,description,city,district,cover_photo_url,logo_url,rating,reviews_count,delivery_fee_egp,min_order_egp,avg_delivery_minutes,is_open,status,featured,offers:restaurant_offers(id,discount_percent,starts_at,ends_at),cuisine_category:cuisine_categories(slug,name_ar,icon)')
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
        <div className="relative h-48 md:h-64 bg-brand-amber/30">
          {restaurant.cover_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurant.cover_photo_url} alt={restaurant.name} className="w-full h-full object-cover" />
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
              <FavoriteButton restaurantId={restaurant.id} />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-brand-ink/60">
              {restaurant.city && <span>📍 {restaurant.city}{restaurant.district ? `، ${restaurant.district}` : ''}</span>}
              {restaurant.rating != null && <span className="text-brand-orange font-bold">⭐ {restaurant.rating.toFixed(1)} ({restaurant.reviews_count})</span>}
              {restaurant.avg_delivery_minutes && <span>🕒 {restaurant.avg_delivery_minutes} دقيقة</span>}
              {restaurant.min_order_egp ? <span>الحد الأدنى للطلب: {restaurant.min_order_egp} ج.م</span> : null}
            </div>
            {restaurant.description && <p className="text-brand-ink/70 mt-3 text-sm">{restaurant.description}</p>}
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

          <div className="mt-10 mb-16">
            <h2 className="text-xl font-bold text-brand-ink mb-4">تقييمات العملاء</h2>
            <ReviewsSection reviews={reviews} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
