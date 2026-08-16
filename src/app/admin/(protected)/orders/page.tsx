'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Order = {
  id: string;
  reference: string;
  status: string;
  payment_method: string;
  subtotal_egp: number;
  delivery_fee_egp: number;
  total_egp: number;
  customer_name: string | null;
  customer_phone: string;
  city: string | null;
  district: string | null;
  created_at: string;
  rider: { id: string; name: string; phone: string } | null;
  restaurant: { id: string; name: string; slug: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'في الانتظار',
  confirmed: 'مؤكد',
  preparing: 'بيتحضّر',
  out_for_delivery: 'في الطريق',
  delivered: 'اتسلّم',
  cancelled: 'ملغي',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-amber-100 text-amber-700',
  out_for_delivery: 'bg-violet-100 text-violet-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'كاش عند الاستلام',
  instapay: 'إنستاباي',
  vodafone_cash: 'فودافون كاش',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders || []);
    } catch (e: any) {
      toast.error(e.message || 'تعذّر تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function unassignRider(orderId: string) {
    setWorkingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign_rider' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('اتشال الطيار — الطلب رجع متاح للطيارين');
      load();
    } catch (e: any) {
      toast.error(e.message || 'حصل خطأ');
    } finally {
      setWorkingId(null);
    }
  }

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-extrabold text-brand-ink">الطلبات ({orders.length})</h1>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                filter === s ? 'bg-brand-red text-white' : 'bg-white border border-gray-200 text-brand-ink/60'
              }`}
            >
              {s === 'all' ? 'الكل' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-brand-ink/50">جاري التحميل...</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-brand-ink/50 bg-white rounded-xl p-8 text-center">مفيش طلبات في القسم ده</p>
      )}

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-brand-ink/50 text-xs border-b border-gray-100">
              <th className="p-3 font-semibold">الكود</th>
              <th className="p-3 font-semibold">المطعم</th>
              <th className="p-3 font-semibold">العميل</th>
              <th className="p-3 font-semibold">الطيار</th>
              <th className="p-3 font-semibold">الإجمالي</th>
              <th className="p-3 font-semibold">الدفع</th>
              <th className="p-3 font-semibold">الحالة</th>
              <th className="p-3 font-semibold">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 last:border-0">
                <td className="p-3 font-mono text-xs">{o.reference}</td>
                <td className="p-3">{o.restaurant?.name || '—'}</td>
                <td className="p-3">
                  {o.customer_name || '—'}
                  <div className="text-xs text-brand-ink/40" dir="ltr">
                    {o.customer_phone}
                  </div>
                </td>
                <td className="p-3">
                  {o.rider ? (
                    <div>
                      <span className="text-xs font-bold">🛵 {o.rider.name}</span>
                      {!['delivered', 'cancelled'].includes(o.status) && (
                        <button
                          onClick={() => unassignRider(o.id)}
                          disabled={workingId === o.id}
                          className="block text-[10px] text-red-500 font-bold hover:underline disabled:opacity-50"
                        >
                          شيل التعيين
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-brand-ink/30">—</span>
                  )}
                </td>
                <td className="p-3 font-bold">{Number(o.total_egp).toLocaleString('ar-EG')} ج</td>
                <td className="p-3 text-xs">{PAYMENT_LABELS[o.payment_method] || o.payment_method}</td>
                <td className="p-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] || ''}`}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-brand-ink/50">
                  {new Date(o.created_at).toLocaleString('ar-EG')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
