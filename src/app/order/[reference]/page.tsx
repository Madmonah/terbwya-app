import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const STATUS_STEPS = [
  { key: 'pending', label: 'قيد الانتظار', emoji: '⏳' },
  { key: 'confirmed', label: 'اتأكد', emoji: '✅' },
  { key: 'preparing', label: 'بيتحضّر', emoji: '👨‍🍳' },
  { key: 'out_for_delivery', label: 'في الطريق', emoji: '🛵' },
  { key: 'delivered', label: 'اتسلّم', emoji: '🎉' },
];

async function getOrder(reference: string) {
  try {
    const supa = getSupabaseClient();
    const { data: order } = await supa
      .from('orders')
      .select('*, restaurant:restaurants(name, slug, logo_url), order_items(*)')
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

  const isCancelled = order.status === 'cancelled';
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{isCancelled ? '❌' : '🧾'}</div>
          <h1 className="text-2xl font-extrabold text-brand-ink mb-1">طلب #{order.reference}</h1>
          <p className="text-brand-ink/60 text-sm">{order.restaurant?.name}</p>
        </div>

        {isCancelled ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-center font-bold mb-6">
            اتلغى الطلب
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <div className="flex justify-between">
              {STATUS_STEPS.map((s, idx) => (
                <div key={s.key} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm mb-1 ${
                      idx <= currentStepIdx ? 'bg-brand-red text-white' : 'bg-brand-cream text-brand-ink/30'
                    }`}
                  >
                    {s.emoji}
                  </div>
                  <span className={`text-[10px] text-center font-bold ${idx <= currentStepIdx ? 'text-brand-ink' : 'text-brand-ink/30'}`}>
                    {s.label}
                  </span>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 w-full mt-[-14px] ${idx < currentStepIdx ? 'bg-brand-red' : 'bg-brand-cream'}`} />
                  )}
                </div>
              ))}
            </div>
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
