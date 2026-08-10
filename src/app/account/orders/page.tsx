'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Loader2, RotateCcw, Star } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseAuthClient } from '@/lib/supabase';
import { replaceCart } from '@/lib/cart';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'بيتحضّر',
  out_for_delivery: 'في الطريق',
  delivered: 'اتسلّم',
  cancelled: 'ملغي',
};

export default function AccountOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supa = getSupabaseAuthClient();
        const { data: { session } } = await supa.auth.getSession();
        if (!session?.user) {
          router.replace('/account/login');
          return;
        }

        const { data: customer } = await supa
          .from('customers')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (!customer) {
          setOrders([]);
          setLoading(false);
          return;
        }

        const { data: ordersData } = await supa
          .from('orders')
          .select('*, restaurant:restaurants(name, slug, cover_photo_url), order_items(*), reviews(id, rating)')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(50);

        setOrders(ordersData || []);
      } catch (e) {
        console.error('[account/orders] load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleReorder(order: any) {
    setReorderingId(order.id);
    try {
      const supa = getSupabaseAuthClient();
      // نجيب الأسعار الحالية للأصناف (ممكن تكون اتغيرت من وقت الطلب القديم)
      const menuItemIds = (order.order_items || [])
        .map((it: any) => it.menu_item_id)
        .filter(Boolean);

      const { data: currentItems } = await supa
        .from('menu_items')
        .select('id, name_ar, price, is_available')
        .in('id', menuItemIds.length > 0 ? menuItemIds : ['00000000-0000-0000-0000-000000000000']);

      const currentById = new Map((currentItems || []).map((i: any) => [i.id, i]));
      const unavailable: string[] = [];

      const cartItems = (order.order_items || [])
        .map((it: any) => {
          const current = it.menu_item_id ? currentById.get(it.menu_item_id) : null;
          if (it.menu_item_id && (!current || !current.is_available)) {
            unavailable.push(it.item_name);
            return null;
          }
          return {
            menuItemId: it.menu_item_id,
            menuSizeId: it.menu_size_id,
            restaurantId: order.restaurant_id,
            restaurantName: order.restaurant?.name || '',
            name: it.item_name,
            price: current ? Number(current.price) : Number(it.unit_price),
            quantity: it.quantity,
          };
        })
        .filter(Boolean);

      if (cartItems.length === 0) {
        toast.error('للأسف كل أصناف الطلب ده مش متاحة دلوقتي');
        return;
      }

      replaceCart(cartItems);

      if (unavailable.length > 0) {
        toast.error(`بعض الأصناف مش متاحة دلوقتي: ${unavailable.join('، ')}`);
      }
      toast.success('اتضافت الأصناف للسلة! 🛒');
      router.push('/cart');
    } catch (e) {
      console.error('[account/orders] reorder error:', e);
      toast.error('حصل خطأ، حاول تاني');
    } finally {
      setReorderingId(null);
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-24 text-center">
          <Loader2 className="w-8 h-8 text-brand-red animate-spin mx-auto" />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-brand-ink mb-6">طلباتي</h1>

        {orders.length === 0 ? (
          <div className="bg-white border border-dashed border-brand-amber rounded-xl p-10 text-center text-brand-ink/60">
            <p className="mb-4">لسه مفيش طلبات</p>
            <Link href="/restaurants" className="text-brand-red font-bold hover:underline">اتصفح المطاعم</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/restaurants/${o.restaurant?.slug}`} className="font-bold text-brand-ink hover:underline no-underline">
                    {o.restaurant?.name}
                  </Link>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-brand-amber/20 text-brand-orange'
                  }`}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
                <p className="text-xs text-brand-ink/50 mb-2">
                  {new Date(o.created_at).toLocaleDateString('ar-EG')} · طلب #{o.reference}
                </p>
                <div className="text-sm text-brand-ink/70 mb-3">
                  {(o.order_items || []).map((it: any) => it.item_name).join('، ')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-red">{o.total_egp} ج.م</span>
                  <div className="flex items-center gap-2">
                    {o.status === 'delivered' && o.reviews?.length > 0 && (
                      <span className="text-xs text-brand-orange font-bold flex items-center gap-1">
                        <Star size={12} fill="currentColor" /> {o.reviews[0].rating}
                      </span>
                    )}
                    {o.status === 'delivered' && (!o.reviews || o.reviews.length === 0) && (
                      <Link
                        href={`/order/${o.reference}`}
                        className="text-xs font-bold text-brand-orange hover:underline"
                      >
                        قيّم الطلب
                      </Link>
                    )}
                    <button
                      onClick={() => handleReorder(o)}
                      disabled={reorderingId === o.id}
                      className="flex items-center gap-1 text-xs font-bold bg-brand-cream text-brand-red px-3 py-1.5 rounded-lg hover:bg-brand-amber/20 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      {reorderingId === o.id ? '...' : 'اطلب تاني'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
