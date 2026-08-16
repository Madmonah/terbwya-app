'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Check, X, Tag, Trash2, CircleStop } from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';

type Offer = {
  id: string;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

type OfferStatus = 'active' | 'upcoming' | 'expired';

function offerStatus(o: Offer): OfferStatus {
  const now = new Date();
  if (new Date(o.ends_at) <= now) return 'expired';
  if (new Date(o.starts_at) > now) return 'upcoming';
  return 'active';
}

const STATUS_META: Record<OfferStatus, { label: string; badge: string; dot: string }> = {
  active: { label: 'نشط دلوقتي', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  upcoming: { label: 'قادم', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  expired: { label: 'منتهي', badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' },
};

function fmt(dt: string): string {
  return new Date(dt).toLocaleString('ar-EG', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

export default function OffersTab({ restaurantId }: { restaurantId: string }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [percent, setPercent] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const supa = getSupabaseAuthClient();
      const { data } = await supa
        .from('restaurant_offers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('starts_at', { ascending: false });
      setOffers((data as Offer[]) || []);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    const p = Number(percent);
    if (!(p > 0) || p > 90) {
      toast.error('نسبة الخصم لازم تكون بين 1 و90%');
      return;
    }
    if (!startsAt || !endsAt) {
      toast.error('حدد بداية ونهاية العرض');
      return;
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (end <= start) {
      toast.error('نهاية العرض لازم تكون بعد بدايته');
      return;
    }
    setSaving(true);
    try {
      const supa = getSupabaseAuthClient();
      const { error } = await supa.from('restaurant_offers').insert({
        restaurant_id: restaurantId,
        discount_percent: p,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      });
      if (error) {
        if ((error.message || '').includes('exclusion') || error.code === '23P01') {
          toast.error('فيه عرض تاني متداخل مع الفترة دي — عدّل التواريخ');
          return;
        }
        throw error;
      }
      toast.success('اتجدول العرض! 🏷️');
      setPercent(''); setStartsAt(''); setEndsAt('');
      setAdding(false);
      load();
    } catch {
      toast.error('حصل خطأ في حفظ العرض');
    } finally {
      setSaving(false);
    }
  }

  // إيقاف عرض نشط فورًا (بنقفل نهايته على دلوقتي)
  async function stopOffer(id: string) {
    setWorkingId(id);
    try {
      const supa = getSupabaseAuthClient();
      const { error } = await supa
        .from('restaurant_offers')
        .update({ ends_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('اتوقف العرض');
      load();
    } catch {
      toast.error('حصل خطأ');
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteOffer(id: string) {
    setWorkingId(id);
    try {
      const supa = getSupabaseAuthClient();
      const { error } = await supa.from('restaurant_offers').delete().eq('id', id);
      if (error) throw error;
      toast.success('اتحذف العرض');
      load();
    } catch {
      toast.error('حصل خطأ');
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-3.5 text-xs text-brand-ink/70">
        <p className="font-bold text-brand-ink mb-1">🏷️ عروضك على تايم لاين</p>
        جدول عروضك مقدمًا: كل عرض له نسبة خصم وبداية ونهاية. العرض بيتفعّل ويقف أوتوماتيك
        في مواعيده، وبيظهر للعملاء بعد تنازلي. مينفعش عرضين يتداخلوا في نفس الفترة.
      </div>

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-brand-red font-bold text-sm hover:underline"
        >
          <Plus size={16} /> جدول عرض جديد
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div>
            <label className="block text-[11px] text-brand-ink/50 mb-1">نسبة الخصم (%)</label>
            <input
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              type="number"
              min="1"
              max="90"
              placeholder="مثلاً 20"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-brand-ink/50 mb-1">يبدأ</label>
              <input
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                type="datetime-local"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] text-brand-ink/50 mb-1">ينتهي</label>
              <input
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                type="datetime-local"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="flex items-center gap-1 bg-brand-red text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <Check size={14} /> {saving ? 'جاري الحفظ...' : 'جدولة العرض'}
            </button>
            <button onClick={() => setAdding(false)} className="flex items-center gap-1 text-brand-ink/50 font-bold px-4 py-2 rounded-lg text-sm">
              <X size={14} /> إلغاء
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-brand-ink/50 text-sm">جاري التحميل...</p>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-brand-ink/50 text-sm">
          <Tag className="w-8 h-8 mx-auto mb-2 text-brand-ink/20" />
          لسه مفيش عروض — جدول أول عرض ليك وهيظهر لعملائك فورًا في وقته
        </div>
      ) : (
        /* التايم لاين */
        <div className="relative pr-4">
          <div className="absolute right-[5px] top-2 bottom-2 w-0.5 bg-gray-200 rounded" />
          <div className="space-y-3">
            {offers.map((o) => {
              const st = offerStatus(o);
              const meta = STATUS_META[st];
              return (
                <div key={o.id} className="relative">
                  <span className={`absolute right-[-16px] top-4 w-3 h-3 rounded-full border-2 border-white ${meta.dot}`} />
                  <div className={`bg-white rounded-xl border p-4 mr-2 ${st === 'active' ? 'border-green-200' : 'border-gray-100'} ${st === 'expired' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-brand-ink">خصم {Number(o.discount_percent)}%</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.label}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {st === 'active' && (
                          <button
                            onClick={() => stopOffer(o.id)}
                            disabled={workingId === o.id}
                            className="flex items-center gap-1 text-xs font-bold text-red-500 border border-red-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            <CircleStop size={12} /> أوقف العرض
                          </button>
                        )}
                        {st === 'upcoming' && (
                          <button
                            onClick={() => deleteOffer(o.id)}
                            disabled={workingId === o.id}
                            className="flex items-center gap-1 text-xs font-bold text-red-500 px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            <Trash2 size={12} /> حذف
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-brand-ink/50 mt-1.5">
                      من {fmt(o.starts_at)} — إلى {fmt(o.ends_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
