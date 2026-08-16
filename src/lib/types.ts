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
  discount_percent?: number;
  discount_ends_at?: string | null;
};

// هل خصم المطعم نشط دلوقتي؟
export function activeDiscount(r: { discount_percent?: number; discount_ends_at?: string | null }): number {
  const d = Number(r.discount_percent || 0);
  if (d <= 0) return 0;
  if (r.discount_ends_at && new Date(r.discount_ends_at) < new Date()) return 0;
  return d;
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
