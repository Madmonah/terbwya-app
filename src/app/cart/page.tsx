'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseClient, getSupabaseAuthClient } from '@/lib/supabase';
import { getCart, updateQuantity, cartTotal, clearCart } from '@/lib/cart';
import { CartItem } from '@/lib/types';

import { Offer, activeDiscount } from '@/lib/types';

type RestaurantLiveInfo = {
  slug: string;
  is_open: boolean;
  status: string;
  delivery_fee_egp: number | null;
  min_order_egp: number | null;
  offers: Offer[] | null;
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantLiveInfo | null>(null);

  // تحديد الموقع بالـ GPS — إجباري عشان الطيار يوصلك صح
  function captureLocation() {
    if (!('geolocation' in navigator)) {
      toast.error('المتصفح مش بيدعم تحديد الموقع');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success('اتحدد موقعك 📍');
      },
      () => {
        setLocating(false);
        toast.error('محتاجين إذن الموقع عشان الطيار يعرف يوصلك — فعّله من إعدادات المتصفح وحاول تاني');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  useEffect(() => {
    setCart(getCart());
    const update = () => setCart(getCart());
    window.addEventListener('terbwya-cart-updated', update);
    return () => window.removeEventListener('terbwya-cart-updated', update);
  }, []);

  // نجيب حالة المطعم اللحظية (مفتوح/مقفول، رسوم التوصيل، الحد الأدنى) عشان
  // نمنع الطلب لو المطعم قفل وهو العميل فاتح صفحة السلة، ونطبّق رسوم التوصيل صح
  useEffect(() => {
    if (cart.length === 0) {
      setRestaurantInfo(null);
      return;
    }
    (async () => {
      try {
        const supa = getSupabaseClient();
        const { data } = await supa
          .from('restaurants')
          .select('slug, is_open, status, delivery_fee_egp, min_order_egp, offers:restaurant_offers(id,discount_percent,starts_at,ends_at)')
          .eq('id', cart[0].restaurantId)
          .maybeSingle();
        setRestaurantInfo(data as RestaurantLiveInfo | null);
      } catch {
        setRestaurantInfo(null);
      }
    })();
  }, [cart.length > 0 ? cart[0].restaurantId : null]);

  // لو العميل عامل تسجيل دخول، نربط الطلب بحسابه (عشان يظهر في "طلباتي")
  // ونعبّي الاسم/التليفون تلقائيًا
  useEffect(() => {
    (async () => {
      try {
        const supa = getSupabaseAuthClient();
        const { data: { session } } = await supa.auth.getSession();
        if (!session?.user) return;
        const { data: customer } = await supa
          .from('customers')
          .select('id, name, phone')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();
        if (customer) {
          setCustomerId(customer.id);
          if (customer.name) setName((prev) => prev || customer.name);
          if (customer.phone) setPhone((prev) => prev || customer.phone);
        }
      } catch {
        // العميل مش مسجّل دخول — مفيش مشكلة، الطلب هيتبعت كـ guest
      }
    })();
  }, []);

  const total = cartTotal(cart);
  const deliveryFee = cart.length > 0 ? (restaurantInfo?.delivery_fee_egp ?? 0) : 0;
  const minOrder = restaurantInfo?.min_order_egp ?? 0;
  const grandTotal = total + deliveryFee;
  const belowMinimum = minOrder > 0 && total < minOrder;
  const restaurantClosed = restaurantInfo ? (!restaurantInfo.is_open || restaurantInfo.status !== 'published') : false;
  const discountActive = restaurantInfo ? activeDiscount({ offers: restaurantInfo.offers }) : 0;

  async function handleSubmit() {
    if (!phone || cart.length === 0) {
      toast.error('محتاجين رقم موبايلك على الأقل عشان نأكد الطلب');
      return;
    }
    if (!location) {
      toast.error('حدد موقعك الأول (زر 📍) عشان الطيار يعرف يوصلك');
      return;
    }
    if (restaurantClosed) {
      toast.error('المطعم مقفول دلوقتي، جرّب تاني بعدين');
      return;
    }
    if (belowMinimum) {
      toast.error(`الحد الأدنى للطلب من المطعم ده ${minOrder} ج.م`);
      return;
    }
    setSubmitting(true);
    try {
      const supa = getSupabaseClient();
      const restaurantId = cart[0].restaurantId;
      const { data, error } = await supa.rpc('create_order', {
        p_restaurant_id: restaurantId,
        p_customer_id: customerId,
        p_customer_name: name || null,
        p_customer_phone: phone,
        p_delivery_address: address || null,
        p_city: city || null,
        p_district: district || null,
        p_notes: notes || null,
        p_items: cart.map((c) => ({
          menu_item_id: c.menuItemId,
          menu_size_id: c.menuSizeId,
          quantity: c.quantity,
        })),
        p_customer_lat: location.lat,
        p_customer_lng: location.lng,
      });

      if (error || !data) throw error;

      // نخزّن رقم التليفون مؤقتًا محليًا عشان صفحة تتبع الطلب تعرف تجيب بياناته
      try {
        window.sessionStorage.setItem(`terbwya_order_phone_${data.reference}`, phone);
      } catch {}

      clearCart();
      router.push(`/order/${data.reference}`);
    } catch (e: any) {
      const msg = e?.message || '';
      const knownErrors: Record<string, string> = {
        restaurant_closed: 'المطعم مقفول دلوقتي، جرّب تاني بعدين',
        restaurant_not_published: 'المطعم مش متاح دلوقتي',
        below_minimum_order: `الحد الأدنى للطلب من المطعم ده ${minOrder} ج.م`,
        menu_item_unavailable: 'صنف في السلة بقى مش متاح، شيله وحاول تاني',
        menu_size_unavailable: 'مقاس صنف في السلة بقى مش متاح، حاول تاني',
        empty_cart: 'السلة فاضية',
        invalid_phone: 'رقم الموبايل مش صحيح',
        location_required: 'حدد موقعك الأول (زر 📍) عشان الطيار يعرف يوصلك',
      };
      toast.error(knownErrors[msg] || 'حصل خطأ في إرسال الطلب، حاول تاني');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-brand-ink mb-6">سلتك</h1>

        {cart.length === 0 ? (
          <div className="bg-white border border-dashed border-brand-amber rounded-xl p-10 text-center text-brand-ink/60">
            <p className="mb-4">السلة فاضية</p>
            <Link href="/restaurants" className="text-brand-red font-bold hover:underline">اتصفح المطاعم</Link>
          </div>
        ) : (
          <>
            {restaurantClosed && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-center font-bold mb-4">
                المطعم ده مقفول دلوقتي — مينفعش تكمّل الطلب
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100 mb-6">
              {cart.map((item) => (
                <div key={`${item.menuItemId}-${item.menuSizeId}`} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-bold text-brand-ink text-sm">{item.name}</div>
                    <div className="text-xs text-brand-ink/50">{item.price} ج.م × {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.menuItemId, item.menuSizeId, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-brand-cream text-brand-ink font-bold"
                    >−</button>
                    <span className="w-5 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, item.menuSizeId, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-brand-cream text-brand-ink font-bold"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            {restaurantInfo?.slug && (
              <Link
                href={`/restaurants/${restaurantInfo.slug}`}
                className="block text-center text-brand-red font-bold text-sm mb-4 hover:underline no-underline"
              >
                ➕ ضيف حاجات تانية من {cart[0]?.restaurantName || 'المطعم'}
              </Link>
            )}

            {belowMinimum && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 text-center text-sm font-bold mb-4">
                الحد الأدنى للطلب من المطعم ده {minOrder} ج.م — لسه ناقصك {(minOrder - total).toFixed(2)} ج.م
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 space-y-2">
              {discountActive > 0 && (
                <div className="flex items-center justify-between text-sm font-bold text-green-700">
                  <span>🏷️ خصم المطعم {discountActive}%</span>
                  <span>مطبّق على الأسعار</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-brand-ink/70">
                <span>المجموع الفرعي</span>
                <span>{total} ج.م</span>
              </div>
              <div className="flex items-center justify-between text-sm text-brand-ink/70">
                <span>رسوم التوصيل</span>
                <span>{deliveryFee > 0 ? `${deliveryFee} ج.م` : 'مجانية'}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="font-bold text-brand-ink">الإجمالي</span>
                <span className="font-extrabold text-brand-red text-lg">{grandTotal} ج.م</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <h2 className="font-bold text-brand-ink mb-1">بيانات التوصيل</h2>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="رقم الموبايل *"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                required
              />
              <div className="flex gap-2">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="المدينة"
                  className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="الحي / المنطقة"
                  className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="العنوان بالتفصيل (شارع، عمارة، دور، شقة)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات للمطعم أو الطيار (اختياري) — مثلاً: من غير بصل، الجرس مبيشتغلش"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />

              {/* تحديد الموقع — إجباري */}
              {location ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-bold text-green-700">📍 موقعك اتحدد — الطيار هيوصلك بالظبط</span>
                  <button
                    type="button"
                    onClick={captureLocation}
                    disabled={locating}
                    className="text-xs font-bold text-green-700 underline"
                  >
                    تحديث
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-brand-red/40 text-brand-red font-bold py-2.5 rounded-lg text-sm disabled:opacity-50"
                >
                  📍 {locating ? 'جاري تحديد موقعك...' : 'حدد موقعي بالـ GPS (مطلوب للتوصيل)'}
                </button>
              )}

              <p className="text-xs text-brand-ink/50">الدفع كاش عند الاستلام حاليًا.</p>
              <button
                onClick={handleSubmit}
                disabled={submitting || restaurantClosed || belowMinimum || !location}
                className="w-full bg-brand-red text-white font-extrabold py-3 rounded-xl hover:bg-brand-red-dark transition-colors disabled:opacity-50"
              >
                {submitting
                  ? 'جاري الإرسال...'
                  : restaurantClosed
                  ? 'المطعم مقفول'
                  : !location
                  ? 'حدد موقعك الأول 📍'
                  : 'تأكيد الطلب'}
              </button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
