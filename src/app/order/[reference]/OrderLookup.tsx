'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getSupabaseClient } from '@/lib/supabase';
import OrderTracker from './OrderTracker';
import EnableOrderNotifications from './EnableOrderNotifications';

type OrderData = {
  id: string;
  reference: string;
  status: string;
  customer_name: string | null;
  customer_phone: string;
  delivery_address: string | null;
  city: string | null;
  district: string | null;
  payment_method: string;
  subtotal_egp: number;
  discount_percent: number;
  discount_egp: number;
  delivery_fee_egp: number;
  total_egp: number;
  restaurant: { name: string; slug: string; logo_url: string | null; lat: number | null; lng: number | null; address: string | null; city: string | null } | null;
  rider: { name: string; phone: string; vehicle_type: string } | null;
  order_items: { id: string; item_name: string; quantity: number; line_total: number }[];
  has_review: boolean;
};

const VEHICLE_EMOJI: Record<string, string> = {
  motorcycle: '🏍️',
  bicycle: '🚲',
  car: '🚗',
};

// صفحة تتبع الطلب أصبحت محمية: لازم رقم موبايل العميل يتطابق مع اللي على
// الطلب عشان تقدر تشوف تفاصيله (RPC آمن بدل قراءة مباشرة من الجدول)
export default function OrderLookup({ reference }: { reference: string }) {
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [autoTried, setAutoTried] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function cancelOrder() {
    if (!order) return;
    setCancelling(true);
    try {
      const supa = getSupabaseClient();
      const { error } = await supa.rpc('cancel_order_by_customer', {
        p_reference: order.reference,
        p_customer_phone: order.customer_phone,
      });
      if (error) throw error;
      setOrder({ ...order, status: 'cancelled' });
      setConfirmingCancel(false);
      toast.success('اتلغى الطلب');
    } catch (e: any) {
      toast.error(
        e?.message === 'cannot_cancel'
          ? 'المطعم بدأ يحضّر طلبك خلاص — كلمه مباشرة لو محتاج تلغي'
          : 'حصل خطأ، حاول تاني'
      );
      setConfirmingCancel(false);
    } finally {
      setCancelling(false);
    }
  }

  async function lookup(p: string) {
    setLoading(true);
    setNotFound(false);
    try {
      const supa = getSupabaseClient();
      const { data, error } = await supa.rpc('get_order_by_reference', {
        p_reference: reference,
        p_customer_phone: p,
      });
      if (error || !data) {
        setNotFound(true);
        setOrder(null);
        return;
      }
      setOrder(data as OrderData);
      try {
        window.sessionStorage.setItem(`terbwya_order_phone_${reference}`, p);
      } catch {}
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  // لو جاي لسه من صفحة السلة، رقم الموبايل يبقى محفوظ مؤقتًا — نستخدمه أوتوماتيك
  useEffect(() => {
    if (autoTried) return;
    setAutoTried(true);
    try {
      const saved = window.sessionStorage.getItem(`terbwya_order_phone_${reference}`);
      if (saved) {
        setPhone(saved);
        lookup(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  if (!order) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-extrabold text-brand-ink mb-2">تتبع طلبك</h1>
        <p className="text-brand-ink/60 mb-6 text-sm">
          أدخل رقم الموبايل اللي استخدمته وقت الطلب عشان تشوف تفاصيل طلب #{reference}
        </p>
        <div className="max-w-xs mx-auto space-y-3">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم الموبايل"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-center"
            dir="ltr"
          />
          <button
            onClick={() => lookup(phone)}
            disabled={loading || !phone}
            className="w-full bg-brand-red text-white font-extrabold py-2.5 rounded-xl disabled:opacity-50"
          >
            {loading ? 'جاري البحث...' : 'عرض الطلب'}
          </button>
          {notFound && (
            <p className="text-red-600 text-sm font-bold">
              مش لاقيين طلب بالرقم ده على الموبايل ده — تأكد وحاول تاني
            </p>
          )}
          <Link href="/restaurants" className="block text-brand-red font-bold hover:underline text-sm mt-4">
            اتصفح المطاعم
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">{order.status === 'cancelled' ? '❌' : '🧾'}</div>
        <h1 className="text-2xl font-extrabold text-brand-ink mb-1">طلب #{order.reference}</h1>
        <p className="text-brand-ink/60 text-sm">{order.restaurant?.name}</p>
      </div>

      <OrderTracker
        orderId={order.id}
        reference={order.reference}
        customerPhone={order.customer_phone}
        initialStatus={order.status}
        hasReview={order.has_review}
      />

      {order.status !== 'cancelled' && order.status !== 'delivered' && (
        <EnableOrderNotifications reference={order.reference} customerPhone={order.customer_phone} />
      )}

      {/* بيانات الطيار لما يتعيّن */}
      {order.rider && order.status !== 'cancelled' && order.status !== 'delivered' && (
        <div className="bg-white rounded-xl border-2 border-brand-red/20 p-4 mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-violet-50 flex items-center justify-center text-xl shrink-0">
              {VEHICLE_EMOJI[order.rider.vehicle_type] || '🛵'}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-brand-ink/50">الطيار بتاعك</p>
              <p className="font-extrabold text-brand-ink text-sm truncate">{order.rider.name}</p>
            </div>
          </div>
          <a
            href={`tel:${order.rider.phone}`}
            className="bg-brand-red text-white text-xs font-bold px-4 py-2 rounded-xl no-underline shrink-0"
          >
            📞 اتصل بيه
          </a>
        </div>
      )}

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
          {(order.order_items || []).map((it) => (
            <div key={it.id} className="flex justify-between text-brand-ink/70">
              <span>{it.item_name} × {it.quantity}</span>
              <span>{it.line_total} ج.م</span>
            </div>
          ))}
        </div>
        {Number(order.discount_egp) > 0 && (
          <div className="flex justify-between text-green-700 text-xs font-bold mt-2 pt-2 border-t border-gray-50">
            <span>🏷️ خصم المطعم ({order.discount_percent}%)</span>
            <span>−{order.discount_egp} ج.م</span>
          </div>
        )}
        <div className="flex justify-between text-brand-ink/60 text-xs mt-2 pt-2 border-t border-gray-50">
          <span>رسوم التوصيل</span>
          <span>{order.delivery_fee_egp > 0 ? `${order.delivery_fee_egp} ج.م` : 'مجانية'}</span>
        </div>
        <div className="flex justify-between border-t border-gray-100 mt-2 pt-3 font-bold text-brand-red">
          <span>الإجمالي</span>
          <span>{order.total_egp} ج.م</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 text-sm text-brand-ink/70 space-y-1">
        <p><span className="font-bold text-brand-ink">التوصيل لـ:</span> {order.customer_name || 'عميل'}</p>
        <p><span className="font-bold text-brand-ink">العنوان:</span> {order.delivery_address}</p>
        <p><span className="font-bold text-brand-ink">الدفع:</span> {order.payment_method === 'cod' ? 'كاش عند الاستلام' : order.payment_method}</p>
      </div>

      {/* إلغاء الطلب — متاح بس قبل ما المطعم يبدأ التحضير */}
      {['pending', 'confirmed'].includes(order.status) && (
        <div className="mb-4">
          {!confirmingCancel ? (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="w-full text-red-500 text-sm font-bold py-2 hover:underline"
            >
              عايز تلغي الطلب؟
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-red-700 mb-3">متأكد إنك عايز تلغي طلب #{order.reference}؟</p>
              <div className="flex gap-2">
                <button
                  onClick={cancelOrder}
                  disabled={cancelling}
                  className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
                >
                  {cancelling ? 'جاري الإلغاء...' : 'أيوة، الغي الطلب'}
                </button>
                <button
                  onClick={() => setConfirmingCancel(false)}
                  disabled={cancelling}
                  className="flex-1 bg-white border border-gray-200 text-brand-ink font-bold py-2.5 rounded-xl text-sm"
                >
                  لا، كمّل الطلب
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {order.restaurant?.slug && ['delivered', 'cancelled'].includes(order.status) && (
        <Link
          href={`/restaurants/${order.restaurant.slug}`}
          className="block text-center bg-brand-red text-white font-extrabold py-3 rounded-xl no-underline mb-3"
        >
          اطلب تاني من {order.restaurant.name} 🔁
        </Link>
      )}

      <Link
        href="/restaurants"
        className={`block text-center font-extrabold py-3 rounded-xl no-underline ${
          ['delivered', 'cancelled'].includes(order.status)
            ? 'bg-white border border-gray-200 text-brand-ink'
            : 'bg-brand-red text-white'
        }`}
      >
        اطلب من مطعم تاني
      </Link>
    </>
  );
}
