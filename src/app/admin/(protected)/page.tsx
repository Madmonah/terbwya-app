'use client';

import { useEffect, useState } from 'react';
import { Store, ClipboardList, Users, UserCircle, Clock, CheckCircle2, Banknote } from 'lucide-react';
import { DailyBarChart, HBarList } from '@/components/charts';

type Stats = {
  restaurantsTotal: number;
  restaurantsPending: number;
  restaurantsPublished: number;
  ordersTotal: number;
  ownersTotal: number;
  customersTotal: number;
  totalRevenueEgp: number;
};

type Analytics = {
  dailyOrders: { label: string; value: number }[];
  dailyRevenue: { label: string; value: number }[];
  statusCounts: { status: string; count: number }[];
  topRestaurants: { label: string; value: number }[];
  busiestRestaurants: { label: string; value: number }[];
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'بيتحضّر',
  out_for_delivery: 'في الطريق',
  delivered: 'اتسلّم',
  cancelled: 'ملغي',
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-brand-ink">{value}</p>
        <p className="text-sm text-brand-ink/50">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          fetch('/api/admin/stats', { cache: 'no-store' }),
          fetch('/api/admin/analytics', { cache: 'no-store' }),
        ]);
        const statsData = await statsRes.json();
        if (!statsRes.ok) throw new Error(statsData.error || 'حصل خطأ');
        setStats(statsData);
        if (analyticsRes.ok) {
          setAnalytics(await analyticsRes.json());
        }
      } catch (e: any) {
        setError(e.message || 'تعذّر تحميل الإحصائيات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-extrabold text-brand-ink mb-6">نظرة عامة</h1>

      {loading && <p className="text-brand-ink/50">جاري التحميل...</p>}
      {error && <p className="text-red-600 font-bold">{error}</p>}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={Store} label="إجمالي المطاعم" value={stats.restaurantsTotal} accent="bg-violet-600" />
          <StatCard icon={Clock} label="مطاعم في انتظار المراجعة" value={stats.restaurantsPending} accent="bg-amber-500" />
          <StatCard icon={CheckCircle2} label="مطاعم منشورة" value={stats.restaurantsPublished} accent="bg-green-600" />
          <StatCard icon={ClipboardList} label="إجمالي الطلبات" value={stats.ordersTotal} accent="bg-blue-600" />
          <StatCard icon={UserCircle} label="أصحاب المطاعم" value={stats.ownersTotal} accent="bg-pink-600" />
          <StatCard icon={Users} label="العملاء" value={stats.customersTotal} accent="bg-teal-600" />
          <StatCard
            icon={Banknote}
            label="إجمالي الإيرادات (طلبات مُسلَّمة)"
            value={`${stats.totalRevenueEgp.toLocaleString('ar-EG')} جنيه`}
            accent="bg-brand-red"
          />
        </div>
      )}

      {analytics && (
        <div className="mt-6 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="font-bold text-brand-ink text-sm mb-3">الطلبات اليومية — آخر 30 يوم</h2>
            <DailyBarChart data={analytics.dailyOrders} valueSuffix=" طلب" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="font-bold text-brand-ink text-sm mb-3">الإيراد اليومي (طلبات مُسلّمة) — آخر 30 يوم</h2>
            <DailyBarChart data={analytics.dailyRevenue} valueSuffix=" ج" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h2 className="font-bold text-brand-ink text-sm mb-3">توزيع حالات الطلبات</h2>
              <HBarList
                items={analytics.statusCounts.map((s) => ({
                  label: STATUS_LABELS[s.status] || s.status,
                  value: s.count,
                }))}
                valueSuffix=" طلب"
              />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h2 className="font-bold text-brand-ink text-sm mb-3">أعلى المطاعم إيرادًا</h2>
              <HBarList items={analytics.topRestaurants} valueSuffix=" ج" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h2 className="font-bold text-brand-ink text-sm mb-3">أكتر المطاعم طلبات</h2>
              <HBarList items={analytics.busiestRestaurants} valueSuffix=" طلب" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
