'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Restaurant = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  district: string | null;
  status: string;
  is_open: boolean;
  featured: boolean;
  rating: number | null;
  reviews_count: number;
  commission_percent: number;
  discount_percent: number;
  created_at: string;
  owner: { id: string; business_name: string; phone: string | null; email: string | null } | null;
  cuisine_category: { name_ar: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  pending_review: 'في انتظار المراجعة',
  published: 'منشور',
  suspended: 'موقوف',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
};

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/restaurants', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestaurants(data.restaurants || []);
    } catch (e: any) {
      toast.error(e.message || 'تعذّر تحميل المطاعم');
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
      const res = await fetch(`/api/admin/restaurants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success('اتحدّثت حالة المطعم');
    } catch (e: any) {
      toast.error(e.message || 'تعذّر التحديث');
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveCommission(id: string, value: string) {
    const commission = Number(value);
    if (isNaN(commission) || commission < 0 || commission > 50) {
      toast.error('نسبة العمولة لازم تكون بين 0 و50%');
      return;
    }
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/restaurants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_percent: commission }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, commission_percent: commission } : r)));
      toast.success(`عمولة ترباوية بقت ${commission}% على المطعم ده`);
    } catch (e: any) {
      toast.error(e.message || 'تعذّر التحديث');
    } finally {
      setUpdatingId(null);
    }
  }

  async function toggleFeatured(id: string, featured: boolean) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/restaurants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, featured } : r)));
    } catch (e: any) {
      toast.error(e.message || 'تعذّر التحديث');
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = filter === 'all' ? restaurants : restaurants.filter((r) => r.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-extrabold text-brand-ink">المطاعم ({restaurants.length})</h1>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending_review', 'published', 'suspended', 'draft'].map((s) => (
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
        <p className="text-brand-ink/50 bg-white rounded-xl p-8 text-center">مفيش مطاعم في القسم ده</p>
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
                  {r.featured && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-amber/20 text-brand-amber">
                      مميز
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-ink/50 mt-1">
                  {r.cuisine_category?.name_ar || '—'} · {r.city || '—'} {r.district ? `- ${r.district}` : ''}
                </p>
                <p className="text-xs text-brand-ink/50">
                  صاحب المطعم: {r.owner?.business_name || '—'} {r.owner?.phone ? `· ${r.owner.phone}` : ''}
                </p>
                <p className="text-xs text-brand-ink/40 mt-1">/{r.slug}</p>
                {Number(r.discount_percent) > 0 && (
                  <p className="text-xs font-bold text-green-700 mt-1">🏷️ عامل خصم {r.discount_percent}% للعملاء</p>
                )}
                <div className="flex items-center gap-1.5 mt-2">
                  <label className="text-xs font-bold text-brand-ink/60">عمولة ترباوية:</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    defaultValue={r.commission_percent ?? 0}
                    disabled={updatingId === r.id}
                    onBlur={(e) => {
                      if (Number(e.target.value) !== Number(r.commission_percent ?? 0)) {
                        saveCommission(r.id, e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center"
                  />
                  <span className="text-xs text-brand-ink/40">% من صافي كل طلب</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {r.status !== 'published' && (
                    <button
                      disabled={updatingId === r.id}
                      onClick={() => updateStatus(r.id, 'published')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white disabled:opacity-50"
                    >
                      موافقة/نشر
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
                  {r.status !== 'pending_review' && (
                    <button
                      disabled={updatingId === r.id}
                      onClick={() => updateStatus(r.id, 'pending_review')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white disabled:opacity-50"
                    >
                      إرجاع للمراجعة
                    </button>
                  )}
                </div>
                <button
                  disabled={updatingId === r.id}
                  onClick={() => toggleFeatured(r.id, !r.featured)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-brand-ink/70 disabled:opacity-50"
                >
                  {r.featured ? 'إلغاء التمييز' : 'تمييز المطعم'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
