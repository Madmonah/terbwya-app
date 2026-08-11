'use client';

import { useEffect, useState } from 'react';
import { Store, ClipboardList, Users, UserCircle, Clock, CheckCircle2, Banknote } from 'lucide-react';

type Stats = {
  restaurantsTotal: number;
  restaurantsPending: number;
  restaurantsPublished: number;
  ordersTotal: number;
  ownersTotal: number;
  customersTotal: number;
  totalRevenueEgp: number;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/stats', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'حصل خطأ');
        setStats(data);
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
    </div>
  );
}
