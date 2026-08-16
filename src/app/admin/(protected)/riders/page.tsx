'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Rider = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  vehicle_type: string;
  status: string;
  is_online: boolean;
  created_at: string;
  restaurant: { name: string } | null;
  delivered_count: number;
  total_earnings: number;
  platform_commission_total: number;
  commission_per_order_egp: number;
  rating: number | null;
  ratings_count: number;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'في انتظار الموافقة',
  active: 'نشط',
  suspended: 'موقوف',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
};

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: '🏍️ موتوسيكل',
  bicycle: '🚲 عجلة',
  car: '🚗 عربية',
};

export default function AdminRidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [commissionInput, setCommissionInput] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/riders', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRiders(data.riders || []);
    } catch (e: any) {
      toast.error(e.message || 'تعذّر تحميل الطيارين');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/riders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRiders((prev) => prev.map((r) => (r.id === id ? { ...r, status, is_online: status === 'active' ? r.is_online : false } : r)));
      toast.success('اتحدّثت حالة الطيار');
    } catch (e: any) {
      toast.error(e.message || 'تعذّر التحديث');
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveCommission(id: string) {
    const value = Number(commissionInput);
    if (!Number.isFinite(value) || value < 0 || value > 500) {
      toast.error('العمولة لازم تكون رقم من 0 لـ 500 جنيه');
      return;
    }
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/riders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_per_order_egp: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRiders((prev) => prev.map((r) => (r.id === id ? { ...r, commission_per_order_egp: value } : r)));
      setEditingCommissionId(null);
      toast.success('اتحدّثت عمولة المنصة — هتتطبق على التسليمات الجاية');
    } catch (e: any) {
      toast.error(e.message || 'تعذّر التحديث');
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = filter === 'all' ? riders : riders.filter((r) => r.status === filter);
  const fleetPlatformTotal = riders.reduce((s, r) => s + Number(r.platform_commission_total || 0), 0);
  const pendingCount = riders.filter((r) => r.status === 'pending').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-extrabold text-brand-ink">
          الطيارين ({riders.length})
          {pendingCount > 0 && (
            <span className="text-sm font-bold text-amber-600 mr-2">— {pendingCount} في انتظار الموافقة</span>
          )}
          {fleetPlatformTotal > 0 && (
            <span className="text-sm font-bold text-green-600 mr-2">
              — دخل المنصة من الدليفري: {fleetPlatformTotal.toLocaleString('ar-EG')} ج
            </span>
          )}
        </h1>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'active', 'suspended'].map((s) => (
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
        <p className="text-brand-ink/50 bg-white rounded-xl p-8 text-center">مفيش طيارين في القسم ده</p>
      )}

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-brand-ink">{r.name}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || ''}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                  {r.status === 'active' && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.is_online ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {r.is_online ? '🟢 متاح دلوقتي' : '⚪ مش متاح'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-ink/50 mt-1" dir="ltr">
                  {r.phone} {r.email ? `· ${r.email}` : ''}
                </p>
                <p className="text-xs text-brand-ink/50 mt-0.5">
                  {VEHICLE_LABELS[r.vehicle_type] || r.vehicle_type} · {r.city || 'كل المدن'} ·{' '}
                  {r.restaurant ? `طيار مطعم "${r.restaurant.name}"` : 'أسطول ترباوية'}
                </p>
                <p className="text-xs text-brand-ink/40 mt-1">
                  وصّل {r.delivered_count} طلب · أرباحه الصافية {Number(r.total_earnings).toLocaleString('ar-EG')} ج
                  {Number(r.platform_commission_total) > 0 && (
                    <span className="text-green-600 font-bold"> · المنصة كسبت منه {Number(r.platform_commission_total).toLocaleString('ar-EG')} ج</span>
                  )}
                  {r.rating != null && r.ratings_count > 0 && ` · ⭐ ${Number(r.rating).toFixed(1)} (${r.ratings_count})`}
                </p>

                {/* عمولة المنصة — أسطول ترباوية بس */}
                {!r.restaurant && (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {editingCommissionId === r.id ? (
                      <>
                        <input
                          value={commissionInput}
                          onChange={(e) => setCommissionInput(e.target.value.replace(/[^\d.]/g, ''))}
                          dir="ltr"
                          inputMode="decimal"
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center font-bold"
                          autoFocus
                        />
                        <span className="text-xs text-brand-ink/50">ج/طلب</span>
                        <button
                          disabled={updatingId === r.id}
                          onClick={() => saveCommission(r.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-red text-white disabled:opacity-50"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => setEditingCommissionId(null)}
                          className="px-2 py-1 text-xs font-bold text-brand-ink/50"
                        >
                          إلغاء
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingCommissionId(r.id);
                          setCommissionInput(String(r.commission_per_order_egp ?? 5));
                        }}
                        className="text-xs font-bold text-brand-ink/60 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-lg"
                      >
                        💰 عمولة المنصة: {Number(r.commission_per_order_egp ?? 5).toLocaleString('ar-EG')} ج/طلب — عدّل
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-1.5 flex-wrap justify-end">
                {r.status !== 'active' && (
                  <button
                    disabled={updatingId === r.id}
                    onClick={() => updateStatus(r.id, 'active')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white disabled:opacity-50"
                  >
                    {r.status === 'pending' ? 'موافقة وتفعيل' : 'إعادة تفعيل'}
                  </button>
                )}
                {r.status !== 'suspended' && (
                  <button
                    disabled={updatingId === r.id}
                    onClick={() => updateStatus(r.id, 'suspended')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white disabled:opacity-50"
                  >
                    إيقاف
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
