'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Check, X, Trash2, MapPin } from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';

type Branch = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  is_open: boolean;
};

// إدارة فروع المطعم: المطعم الأساسي هو الفرع الرئيسي، ودول فروع إضافية.
// الطلب بيتوجه أوتوماتيك لأقرب فرع مفتوح لموقع العميل.
export default function BranchesSection({ restaurantId }: { restaurantId: string }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const supa = getSupabaseAuthClient('owner');
      const { data } = await supa
        .from('restaurant_branches')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at');
      setBranches((data as Branch[]) || []);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  function captureLocation() {
    if (!('geolocation' in navigator)) {
      toast.error('المتصفح مش بيدعم تحديد الموقع');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success('اتحدد موقع الفرع 📍');
      },
      () => {
        setLocating(false);
        toast.error('مقدرناش نحدد الموقع — اسمح بإذن الموقع وحاول تاني');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function handleAdd() {
    if (!name.trim()) {
      toast.error('اسم الفرع مطلوب (مثلاً: فرع المعادي)');
      return;
    }
    setSaving(true);
    try {
      const supa = getSupabaseAuthClient('owner');
      const { error } = await supa.from('restaurant_branches').insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        city: city.trim() || null,
        district: district.trim() || null,
        address: address.trim() || null,
        phone: phone.replace(/\D/g, '') || null,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      });
      if (error) throw error;
      toast.success('اتضاف الفرع! الطلبات القريبة منه هتتوجه له أوتوماتيك');
      setName(''); setCity(''); setDistrict(''); setAddress(''); setPhone(''); setLocation(null);
      setAdding(false);
      load();
    } catch {
      toast.error('حصل خطأ في إضافة الفرع');
    } finally {
      setSaving(false);
    }
  }

  async function toggleOpen(id: string, current: boolean) {
    setWorkingId(id);
    try {
      const supa = getSupabaseAuthClient('owner');
      const { error } = await supa
        .from('restaurant_branches')
        .update({ is_open: !current })
        .eq('id', id);
      if (error) throw error;
      setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, is_open: !current } : b)));
    } catch {
      toast.error('حصل خطأ');
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteBranch(id: string) {
    setWorkingId(id);
    try {
      const supa = getSupabaseAuthClient('owner');
      const { error } = await supa.from('restaurant_branches').delete().eq('id', id);
      if (error) throw error;
      toast.success('اتحذف الفرع');
      load();
    } catch {
      toast.error('حصل خطأ');
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <h3 className="font-bold text-brand-ink text-sm">🏪 الفروع</h3>
      <p className="text-xs text-brand-ink/50">
        عنوان مطعمك الأساسي فوق هو الفرع الرئيسي. ضيف فروعك التانية هنا — كل طلب بيتوجه
        أوتوماتيك لأقرب فرع مفتوح لموقع العميل، والطيار بيستلم منه.
      </p>

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-brand-red font-bold text-sm hover:underline"
        >
          <Plus size={16} /> ضيف فرع جديد
        </button>
      ) : (
        <div className="bg-brand-cream rounded-lg p-3 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم الفرع (مثلاً: فرع المعادي) *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <div className="flex gap-2">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="المدينة"
              className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="الحي"
              className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="عنوان الفرع بالتفصيل"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="تليفون الفرع (اختياري)"
            dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          {location ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-xs font-bold text-green-700">📍 موقع الفرع اتحدد</span>
              <button type="button" onClick={captureLocation} disabled={locating} className="text-xs font-bold text-green-700 underline">
                تحديث
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={captureLocation}
              disabled={locating}
              className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-brand-red/40 text-brand-red font-bold py-2 rounded-lg text-xs disabled:opacity-50"
            >
              <MapPin size={13} /> {locating ? 'جاري التحديد...' : 'حدد موقع الفرع بالـ GPS (وأنت فيه)'}
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="flex items-center gap-1 bg-brand-red text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <Check size={14} /> {saving ? 'جاري الإضافة...' : 'إضافة الفرع'}
            </button>
            <button onClick={() => setAdding(false)} className="flex items-center gap-1 text-brand-ink/50 font-bold px-4 py-2 rounded-lg text-sm">
              <X size={14} /> إلغاء
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-brand-ink/50 text-xs">جاري التحميل...</p>
      ) : branches.length > 0 ? (
        <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg">
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-3 gap-2">
              <div className="min-w-0">
                <p className="font-bold text-brand-ink text-sm">{b.name}</p>
                <p className="text-xs text-brand-ink/50 truncate">
                  {[b.address, b.district, b.city].filter(Boolean).join(' — ') || 'من غير عنوان'}
                  {b.lat != null ? ' · 📍' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleOpen(b.id, b.is_open)}
                  disabled={workingId === b.id}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full disabled:opacity-50 ${
                    b.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {b.is_open ? 'مفتوح' : 'مقفول'}
                </button>
                <button
                  onClick={() => deleteBranch(b.id)}
                  disabled={workingId === b.id}
                  className="text-red-400 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
