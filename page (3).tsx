import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseClient } from '@/lib/supabase';
import OrderTracker from './OrderTracker';

export const dynamic = 'force-dynamic';

async function getOrder(reference: string) {
  try {
    const supa = getSupabaseClient();
    const { data: order } = await supa
      .from('orders')
      .select('*, restaurant:restaurants(name, slug, logo_url, lat, lng, address, city), order_items(*), reviews(id)')
      .eq('reference', reference)
      .maybeSingle();
    return order;
  } catch {
    return null;
  }
}

export default async function OrderTrackingPage({ params }: { params: { reference: string } }) {
  const order = await getOrder(params.reference);

  if (!order) {
    return (
      <>
        <Header />
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-extrabold text-brand-ink mb-2">مش لاقيين الطلب ده</h1>
          <p className="text-brand-ink/60 mb-6">تأكد من رقم الطلب وحاول تاني.</p>
          <Link href="/restaurants" className="text-brand-red font-bold hover:underline">اتصفح المطاعم</Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{order.status === 'cancelled' ? '❌' : '🧾'}</div>
          <h1 className="text-2xl font-extrabold text-brand-ink mb-1">طلب #{order.reference}</h1>
          <p className="text-brand-ink/60 text-sm">{order.restaurant?.name}</p>
        </div>

        <OrderTracker
          orderId={order.id}
          initialStatus={order.status}
          customerPhone={order.customer_phone}
          hasReview={(order.reviews?.length || 0) > 0}
        />

        {order.status !== 'cancelled' && order.status !== 'delivered' && order.restaurant?.lat && order.restaurant?.lng && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
            <iframe
              title="موقع المطعم"
              className="w-full h-48 border-0"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.restaurant.lng - 0.01}%2C${order.restaurant.lat - 0.01}%2C${order.restaurant.lng + 0.01}%2C${order.restaurant.lat + 0.01}&layer=mapnik&marker=${order.restaurant.lat}%2C${order.restaurant.lng}`}
            />
            <p className="text-xs text-brand-ink/50 text-center py-2">📍 موقع المطعم — {order.restaurant.address}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h2 className="font-bold text-brand-ink mb-3 text-sm">تفاصيل الطلب</h2>
          <div className="space-y-1.5 text-sm">
            {(order.order_items || []).map((it: any) => (
              <div key={it.id} className="flex justify-between text-brand-ink/70">
                <span>{it.item_name} × {it.quantity}</span>
                <span>{it.line_total} ج.م</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-gray-100 mt-3 pt-3 font-bold text-brand-red">
            <span>الإجمالي</span>
            <span>{order.total_egp} ج.م</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 text-sm text-brand-ink/70 space-y-1">
          <p><span className="font-bold text-brand-ink">التوصيل لـ:</span> {order.customer_name || 'عميل'}</p>
          <p><span className="font-bold text-brand-ink">العنوان:</span> {order.delivery_address}</p>
          <p><span className="font-bold text-brand-ink">الدفع:</span> {order.payment_method === 'cod' ? 'كاش عند الاستلام' : order.payment_method}</p>
        </div>

        <Link href="/restaurants" className="block text-center bg-brand-red text-white font-extrabold py-3 rounded-xl no-underline">
          اطلب من مطعم تاني
        </Link>
      </main>
      <Footer />
    </>
  );
}
