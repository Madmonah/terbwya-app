'use client';

import { useEffect, useState } from 'react';
import { getSupabaseAuthClient } from '@/lib/supabase';
import { DailyBarChart, HBarList, DailyPoint } from '@/components/charts';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'بيتحضّر',
  out_for_delivery: 'في الطريق',
  delivered: 'اتسلّم',
  cancelled: 'ملغي',
};

type OrderRow = {
  id: string;
  status: string;
  total_egp: number;
  commission_egp: number;
  created_at: string;
  order_items: { item_name: string; quantity: number }[] | null;
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric' });
}

export default function AnalyticsTab({ restaurantId }: { restaurantId: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supa = getSupabaseAuthClient();
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data } = await supa
          .from('orders')
          .select('id, status, total_egp, commission_egp, created_at, order_items(item_name, quantity)')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: true });
        setOrders((data || []) as OrderRow[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [restaurantId]);

  if (loading) {
    return <p className="text-brand-ink/50 py-8 text-center">جاري تحميل التحليلات...</p>;
  }

  // 1) الإيراد اليومي (المُسلّم) آخر 30 يوم
  const days: Date[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const revenueByDay = new Map<string, number>();
  const ordersByDay = new Map<string, number>();
  for (const o of orders) {
    const k = dayKey(new Date(o.created_at));
    ordersByDay.set(k, (ordersByDay.get(k) || 0) + 1);
    if (o.status === 'delivered') {
      revenueByDay.set(k, (revenueByDay.get(k) || 0) + Number(o.total_egp || 0));
    }
  }
  const revenueSeries: DailyPoint[] = days.map((d) => ({
    label: dayLabel(d),
    value: revenueByDay.get(dayKey(d)) || 0,
  }));
  const ordersSeries: DailyPoint[] = days.map((d) => ({
    label: dayLabel(d),
    value: ordersByDay.get(dayKey(d)) || 0,
  }));

  // 2) أكتر الأصناف طلبًا
  const itemCounts = new Map<string, number>();
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    for (const it of o.order_items || []) {
      itemCounts.set(it.item_name, (itemCounts.get(it.item_name) || 0) + it.quantity);
    }
  }
  const topItems = [...itemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([label, value]) => ({ label, value }));

  // 3) توزيع حالات الطلبات
  const statusCounts = new Map<string, number>();
  for (const o of orders) {
    statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);
  }
  const statusList = [...statusCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([s, value]) => ({ label: STATUS_LABELS[s] || s, value }));

  const totalRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total_egp || 0), 0);
  const avgOrder =
    orders.filter((o) => o.status === 'delivered').length > 0
      ? totalRevenue / orders.filter((o) => o.status === 'delivered').length
      : 0;
  const totalCommission = orders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.commission_egp || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold tracking-wider uppercase text-brand-ink/50 mb-1">إيراد آخر 30 يوم</p>
          <p className="text-xl font-black text-brand-ink">{totalRevenue.toLocaleString('ar-EG')} ج</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold tracking-wider uppercase text-brand-ink/50 mb-1">عدد الطلبات</p>
          <p className="text-xl font-black text-brand-ink">{orders.length.toLocaleString('ar-EG')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold tracking-wider uppercase text-brand-ink/50 mb-1">متوسط قيمة الطلب</p>
          <p className="text-xl font-black text-brand-ink">{Math.round(avgOrder).toLocaleString('ar-EG')} ج</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold tracking-wider uppercase text-brand-ink/50 mb-1">مستحقات ترباوية (عمولة)</p>
          <p className="text-xl font-black text-brand-red">{totalCommission.toLocaleString('ar-EG')} ج</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-bold text-brand-ink text-sm mb-3">الإيراد اليومي (طلبات مُسلّمة) — آخر 30 يوم</h3>
        <DailyBarChart data={revenueSeries} valueSuffix=" ج" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-bold text-brand-ink text-sm mb-3">عدد الطلبات اليومي — آخر 30 يوم</h3>
        <DailyBarChart data={ordersSeries} valueSuffix=" طلب" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-bold text-brand-ink text-sm mb-3">أكتر الأصناف طلبًا</h3>
          <HBarList items={topItems} valueSuffix=" قطعة" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-bold text-brand-ink text-sm mb-3">توزيع حالات الطلبات</h3>
          <HBarList items={statusList} valueSuffix=" طلب" />
        </div>
      </div>
    </div>
  );
}
