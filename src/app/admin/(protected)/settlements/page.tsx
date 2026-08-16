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

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [totals, setTotals] = useState<{ commission_total_egp: number; month_commission_egp: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settlements', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSettlements(data.settlements || []);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-red flex items-center justify-center shrink-0">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-brand-ink">
                {totals.month_commission_egp.toLocaleString('ar-EG')} ج
              </p>
              <p className="text-sm text-brand-ink/50">عمولات الشهر الحالي</p>
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
              <p className="text-sm text-brand-ink/50">إجمالي العمولات من البداية</p>
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
    </div>
  );
}
