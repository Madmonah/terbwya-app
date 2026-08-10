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

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    setCart(getCart());
    const update = () => setCart(getCart());
    window.addEventListener('terbwya-cart-updated', update);
    return () => window.removeEventListener('terbwya-cart-updated', update);
  }, []);

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

  async function handleSubmit() {
    if (!phone || cart.length === 0) {
      toast.error('محتاجين رقم موبايلك على الأقل عشان نأكد الطلب');
      return;
    }
    setSubmitting(true);
    try {
      const supa = getSupabaseClient();
      const restaurantId = cart[0].restaurantId;
      const { data: order, error } = await supa
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          customer_id: customerId,
          customer_name: name || null,
          customer_phone: phone,
          delivery_address: address || null,
          city: city || null,
          payment_method: 'cod',
          subtotal_egp: total,
          delivery_fee_egp: 0,
          total_egp: total,
        })
        .select('id, reference')
        .single();

      if (error || !order) throw error;

      const items = cart.map((c) => ({
        order_id: order.id,
        menu_item_id: c.menuItemId,
        menu_size_id: c.menuSizeId,
        item_name: c.name,
        unit_price: c.price,
        quantity: c.quantity,
        line_total: c.price * c.quantity,
      }));
      await supa.from('order_items').insert(items);

      clearCart();
      router.push(`/order/${order.reference}`);
    } catch (e) {
      toast.error('حصل خطأ في إرسال الطلب، حاول تاني');
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

            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex items-center justify-between">
              <span className="font-bold text-brand-ink">الإجمالي</span>
              <span className="font-extrabold text-brand-red text-lg">{total} ج.م</span>
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
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="المدينة"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="العنوان بالتفصيل"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
              <p className="text-xs text-brand-ink/50">الدفع كاش عند الاستلام حاليًا.</p>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-brand-red text-white font-extrabold py-3 rounded-xl hover:bg-brand-red-dark transition-colors disabled:opacity-50"
              >
                {submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
