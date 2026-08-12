'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import OrderTracker from './OrderTracker';

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
  delivery_fee_egp: number;
  total_egp: number;
  restaurant: { name: string; slug: string; logo_url: string | null; lat: number | null; lng: number | null; address: string | null; city: string | null } | null;
  order_items: { id: string; item_name: string; quantity: number; line_total: number }[];
  has_review: boolean;
};

// صفحة تتبع الطلب أصبحت محمية: لازم رقم موبايل العميل يتطابق مع اللي على
// الطلب عشان تقدر تشوف تفاصيله (RPC آمن بدل قراءة مباشرة من الجدول)
export default function OrderLookup({ reference }: { reference: string }) {
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

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

      <Link href="/restaurants" className="block text-center bg-brand-red text-white font-extrabold py-3 rounded-xl no-underline">
        اطلب من مطعم تاني
      </Link>
    </>
  );
}
