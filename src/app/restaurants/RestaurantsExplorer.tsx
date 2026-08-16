'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, MapPin } from 'lucide-react';
import { Restaurant, CuisineCategory, activeDiscount } from '@/lib/types';

type SortOption = 'featured' | 'nearest' | 'rating' | 'delivery_time' | 'price_low';

const SORT_LABELS: Record<SortOption, string> = {
  featured: 'الأفضل',
  nearest: 'الأقرب ليك',
  rating: 'الأعلى تقييمًا',
  delivery_time: 'الأسرع توصيلًا',
  price_low: 'الأقل سعرًا',
};

// مسافة تقريبية بالكيلومتر بين نقطتين (Haversine)
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RestaurantsExplorer({
  restaurants,
  categories,
  initialCuisine,
  initialQuery,
}: {
  restaurants: Restaurant[];
  categories: CuisineCategory[];
  initialCuisine?: string | null;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery || '');
  const [cuisineSlug, setCuisineSlug] = useState<string | null>(initialCuisine ?? null);
  const [sort, setSort] = useState<SortOption>('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxDeliveryFee, setMaxDeliveryFee] = useState<number | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  function useMyLocation() {
    if (myLocation) {
      setSort('nearest');
      return;
    }
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort('nearest');
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const filtered = useMemo(() => {
    let list = [...restaurants];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          (r.city || '').toLowerCase().includes(q)
      );
    }

    if (cuisineSlug) {
      list = list.filter((r) => r.cuisine_category?.slug === cuisineSlug);
    }

    if (minRating > 0) {
      list = list.filter((r) => (r.rating || 0) >= minRating);
    }

    if (maxDeliveryFee !== null) {
      list = list.filter((r) => (r.delivery_fee_egp || 0) <= maxDeliveryFee);
    }

    switch (sort) {
      case 'nearest':
        if (myLocation) {
          list.sort((a, b) => {
            const da = a.lat != null && a.lng != null ? distanceKm(myLocation.lat, myLocation.lng, a.lat, a.lng) : 99999;
            const db = b.lat != null && b.lng != null ? distanceKm(myLocation.lat, myLocation.lng, b.lat, b.lng) : 99999;
            return da - db;
          });
        }
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'delivery_time':
        list.sort((a, b) => (a.avg_delivery_minutes || 999) - (b.avg_delivery_minutes || 999));
        break;
      case 'price_low':
        list.sort((a, b) => (a.min_order_egp || 0) - (b.min_order_egp || 0));
        break;
      default:
        list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return list;
  }, [restaurants, query, cuisineSlug, sort, minRating, maxDeliveryFee, myLocation]);

  const activeFilterCount = (minRating > 0 ? 1 : 0) + (maxDeliveryFee !== null ? 1 : 0);

  return (
    <div>
      {/* بحث فوري */}
      <div className="relative mb-4">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-ink/30" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم المطعم أو نوع الأكل..."
          className="w-full bg-white border border-gray-200 rounded-xl pr-11 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-ink/30 hover:text-brand-ink"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* فئات المطبخ */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        <button
          onClick={() => setCuisineSlug(null)}
          className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all ${
            !cuisineSlug
              ? 'bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-sm'
              : 'bg-white border border-brand-amber/40 text-brand-ink hover:border-brand-orange'
          }`}
        >
          الكل
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCuisineSlug(c.slug === cuisineSlug ? null : c.slug)}
            className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all ${
              cuisineSlug === c.slug
                ? 'bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-sm'
                : 'bg-white border border-brand-amber/40 text-brand-ink hover:border-brand-orange'
            }`}
          >
            {c.icon} {c.name_ar}
          </button>
        ))}
      </div>

      {/* ترتيب وفلاتر */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-2 overflow-x-auto">
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <button
              key={key}
              onClick={() => (key === 'nearest' ? useMyLocation() : setSort(key))}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                sort === key ? 'bg-brand-ink text-white' : 'bg-brand-cream text-brand-ink/60'
              }`}
            >
              {key === 'nearest' && <MapPin size={12} />}
              {key === 'nearest' && locating ? 'جاري تحديد موقعك...' : SORT_LABELS[key]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-bold text-brand-ink bg-white border border-brand-amber/40 hover:border-brand-orange px-3 py-1.5 rounded-lg transition-colors"
        >
          <SlidersHorizontal size={14} />
          فلاتر
          {activeFilterCount > 0 && (
            <span className="bg-gradient-to-br from-violet-600 to-violet-800 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 space-y-4">
          <div>
            <p className="text-xs font-bold text-brand-ink/60 mb-2">الحد الأدنى للتقييم</p>
            <div className="flex gap-2">
              {[0, 3, 4, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    minRating === r ? 'bg-brand-orange text-white' : 'bg-brand-cream text-brand-ink/60'
                  }`}
                >
                  {r === 0 ? 'الكل' : `⭐ ${r}+`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-brand-ink/60 mb-2">رسوم التوصيل</p>
            <div className="flex gap-2">
              {[null, 0, 20, 50].map((fee) => (
                <button
                  key={String(fee)}
                  onClick={() => setMaxDeliveryFee(fee)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    maxDeliveryFee === fee ? 'bg-brand-orange text-white' : 'bg-brand-cream text-brand-ink/60'
                  }`}
                >
                  {fee === null ? 'الكل' : fee === 0 ? 'توصيل مجاني' : `حتى ${fee} ج`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-brand-ink/40 mb-3">{filtered.length} مطعم</p>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-brand-amber rounded-xl p-10 text-center text-brand-ink/60">
          <p className="font-bold mb-1">مفيش مطاعم مطابقة</p>
          <p className="text-sm">جرّب تغيّر البحث أو الفلاتر.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/restaurants/${r.slug}`}
              className="block bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all no-underline"
            >
              <div className="relative aspect-[4/3] bg-brand-cream flex items-center justify-center overflow-hidden">
                {r.cover_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.cover_photo_url} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-4xl">🍽️</span>
                )}
                {activeDiscount(r) > 0 && (
                  <span className="absolute top-2 right-2 text-[11px] font-black px-2 py-1 rounded-full bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow">
                    🏷️ خصم {activeDiscount(r)}%
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="font-bold text-brand-ink text-sm leading-snug line-clamp-1">{r.name}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-brand-ink/50">
                  {r.city && <span>{r.city}</span>}
                  {r.avg_delivery_minutes && <span>· {r.avg_delivery_minutes} د</span>}
                  {myLocation && r.lat != null && r.lng != null && (
                    <span className="text-brand-red font-bold">
                      · {distanceKm(myLocation.lat, myLocation.lng, r.lat, r.lng).toFixed(1)} كم
                    </span>
                  )}
                </div>
                {r.rating != null && (
                  <div className="text-xs text-brand-orange font-bold mt-1">⭐ {r.rating.toFixed(1)} ({r.reviews_count})</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
