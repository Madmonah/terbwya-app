'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Banknote } from 'lucide-react';

type Settlement = {
  restaurant_id: string;
  name: string;
  commission_percent: number;
  delivered_count: number;
  gross_egp: number;
  commission_total_egp: number;
  month_delivered_count: number;
  month_commission_egp: number;
};

type RiderSettlement = {
  rider_id: string;
  name: string;
  commission_per_order_egp: number;
  delivered_count: number;
  commission_total_egp: number;
  month_delivered_count: number;
  month_commission_egp: number;
};

type Totals = {
  commission_total_egp: number;
  month_commission_egp: number;
  delivery_commission_total_egp?: number;
  month_delivery_commission_egp?: number;
  platform_total_egp?: number;
  month_platform_total_egp?: number;
};

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [riderSettlements, setRiderSettlements] = useState<RiderSettlement[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settlements', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSettlements(data.settlements || []);
        setRiderSettlements(data.rider_settlements || []);
        setTotals(data.totals || null);
      } catch (e: any) {
        toast.error(e.message || 'تعذّر تحميل الحسابات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-extrabold text-brand-ink mb-2">الحسابات والعمولات</h1>
      <p className="text-sm text-brand-ink/50 mb-6">
        عمولة ترباوية بتتحسب من صافي كل طلب مُسلّم (بعد خصم المطعم) بالنسبة المحددة لكل مطعم.
        النسبة بتتظبط من صفحة المطاعم.
      </p>

      {loading && <p className="text-brand-ink/50">جاري التحميل...</p>}

      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-red flex items-center justify-center shrink-0">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-brand-ink">
                {Number(totals.month_platform_total_egp ?? totals.month_commission_egp).toLocaleString('ar-EG')} ج
              </p>
              <p className="text-sm text-brand-ink/50">دخل المنصة الشهر ده (مطاعم + دليفري)</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-brand-ink">
                {totals.commission_total_egp.toLocaleString('ar-EG')} ج
              </p>
              <p className="text-sm text-brand-ink/50">إجمالي عمولات المطاعم</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-brand-ink">
                {Number(totals.delivery_commission_total_egp || 0).toLocaleString('ar-EG')} ج
              </p>
              <p className="text-sm text-brand-ink/50">إجمالي دخل الدليفري (أسطول ترباوية)</p>
            </div>
          </div>
        </div>
      )}

      {!loading && settlements.length === 0 && (
        <p className="text-brand-ink/50 bg-white rounded-xl p-8 text-center">
          مفيش طلبات مُسلّمة لسه — العمولات هتظهر هنا أول ما الطلبات تتسلم
        </p>
      )}

      {settlements.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-brand-ink/50 text-xs border-b border-gray-100">
                <th className="p-3 font-semibold">المطعم</th>
                <th className="p-3 font-semibold">النسبة</th>
                <th className="p-3 font-semibold">طلبات الشهر</th>
                <th className="p-3 font-semibold">عمولة الشهر</th>
                <th className="p-3 font-semibold">إجمالي الطلبات</th>
                <th className="p-3 font-semibold">إجمالي المبيعات</th>
                <th className="p-3 font-semibold">إجمالي العمولة</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.restaurant_id} className="border-b border-gray-50 last:border-0">
                  <td className="p-3 font-bold">{s.name}</td>
                  <td className="p-3">{s.commission_percent}%</td>
                  <td className="p-3">{s.month_delivered_count.toLocaleString('ar-EG')}</td>
                  <td className="p-3 font-bold text-brand-red">
                    {s.month_commission_egp.toLocaleString('ar-EG')} ج
                  </td>
                  <td className="p-3">{s.delivered_count.toLocaleString('ar-EG')}</td>
                  <td className="p-3">{s.gross_egp.toLocaleString('ar-EG')} ج</td>
                  <td className="p-3 font-bold">{s.commission_total_egp.toLocaleString('ar-EG')} ج</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* دخل الدليفري — عمولة المنصة من طيارين أسطول ترباوية */}
      {riderSettlements.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-extrabold text-brand-ink mb-2">🛵 دخل الدليفري — أسطول ترباوية</h2>
          <p className="text-sm text-brand-ink/50 mb-4">
            عمولة ثابتة لكل طلب يتسلمه طيار من أسطول المنصة، بتتخصم من رسوم التوصيل.
            العمولة بتتظبط لكل طيار من صفحة الطيارين. الطيار بيقبض الفلوس كاش من العميل —
            والعمولة دي بيوردها للمنصة في التسوية.
          </p>
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-brand-ink/50 text-xs border-b border-gray-100">
                  <th className="p-3 font-semibold">الطيار</th>
                  <th className="p-3 font-semibold">العمولة/طلب</th>
                  <th className="p-3 font-semibold">طلبات الشهر</th>
                  <th className="p-3 font-semibold">مستحق الشهر</th>
                  <th className="p-3 font-semibold">إجمالي الطلبات</th>
                  <th className="p-3 font-semibold">إجمالي المستحق</th>
                </tr>
              </thead>
              <tbody>
                {riderSettlements.map((s) => (
                  <tr key={s.rider_id} className="border-b border-gray-50 last:border-0">
                    <td className="p-3 font-bold">{s.name}</td>
                    <td className="p-3">{Number(s.commission_per_order_egp).toLocaleString('ar-EG')} ج</td>
                    <td className="p-3">{s.month_delivered_count.toLocaleString('ar-EG')}</td>
                    <td className="p-3 font-bold text-green-700">
                      {s.month_commission_egp.toLocaleString('ar-EG')} ج
                    </td>
                    <td className="p-3">{s.delivered_count.toLocaleString('ar-EG')}</td>
                    <td className="p-3 font-bold">{s.commission_total_egp.toLocaleString('ar-EG')} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
