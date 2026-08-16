export type CuisineCategory = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  icon: string | null;
  display_order: number;
};

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cuisine_category_id: string | null;
  cuisine_category?: CuisineCategory | null;
  city: string | null;
  district: string | null;
  cover_photo_url: string | null;
  logo_url: string | null;
  rating: number | null;
  reviews_count: number;
  delivery_fee_egp: number | null;
  min_order_egp: number | null;
  avg_delivery_minutes: number | null;
  is_open: boolean;
  status: string;
  featured: boolean;
  lat?: number | null;
  lng?: number | null;
  offers?: Offer[];
};

export type Offer = {
  id: string;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
};

// العرض النشط دلوقتي من تايم لاين العروض (أو null)
export function activeOffer(offers?: Offer[] | null): Offer | null {
  if (!offers || offers.length === 0) return null;
  const now = new Date();
  const active = offers.filter(
    (o) => new Date(o.starts_at) <= now && new Date(o.ends_at) > now
  );
  if (active.length === 0) return null;
  return active.reduce((best, o) =>
    Number(o.discount_percent) > Number(best.discount_percent) ? o : best
  );
}

export function activeDiscount(r: { offers?: Offer[] | null }): number {
  const offer = activeOffer(r.offers);
  return offer ? Number(offer.discount_percent) : 0;
}

// "ينتهي خلال..." — صياغة عربية بسيطة للوقت المتبقي
export function timeLeftLabel(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'انتهى';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days >= 2) return `ينتهي خلال ${days} أيام`;
  if (days === 1) return 'ينتهي خلال يوم';
  if (hours >= 2) return `ينتهي خلال ${hours} ساعات`;
  if (hours === 1) return 'ينتهي خلال ساعة';
  const minutes = Math.max(1, Math.floor(ms / 60000));
  return `ينتهي خلال ${minutes} دقيقة`;
}

export type MenuItemSize = {
  id: string;
  menu_item_id: string;
  name_ar: string;
  price: number;
  is_available: boolean;
  display_order: number;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category: string | null;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  price: number;
  currency: string;
  photo_url: string | null;
  is_available: boolean;
  display_order: number;
  sizes?: MenuItemSize[];
};

export type CartItem = {
  menuItemId: string;
  menuSizeId: string | null;
  restaurantId: string;
  restaurantName: string;
  name: string;
  price: number;
  quantity: number;
};
