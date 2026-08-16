'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Check, X, Bike } from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';

type Rider = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  is_online: boolean;
  created_at: string;
};

export default function RidersTab({ restaurantId }: { restaurantId: string }) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const supa = getSupabaseAuthClient();
      const { data } = await supa
        .from('riders')
        .select('id, name, phone, email, status, is_online, created_at')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      setRiders((data as Rider[]) || []);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!name.trim() || !phone || !email || password.length < 6) {
      toast.error('كمّل كل البيانات (كلمة السر 6 حروف على الأقل)');
      return;
    }
    setSaving(true);
    try {
      const supa = getSupabaseAuthClient();
      const { data: { session } } = await supa.auth.getSession();
      if (!session) throw new Error('no_session');

      const res = await fetch('/api/owner/riders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ restaurantId, name, phone, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errors: Record<string, string> = {
          email_exists: 'الإيميل ده مستخدم قبل كده',
          invalid_phone: 'رقم الموبايل غير صحيح (01 + 11 رقم)',
          invalid_email: 'الإيميل غير صحيح',
          weak_password: 'كلمة السر لازم 6 حروف على الأقل',
        };
        toast.error(errors[data.error] || 'حصل خطأ');
        return;
      }
      toast.success(`اتضاف ${name} كطيار لمطعمك! ابعتله بيانات الدخول`);
      setName(''); setPhone(''); setEmail(''); setPassword('');
      setAdding(false);
      load();
    } catch {
      toast.error('حصل خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-3.5 text-xs text-brand-ink/70">
        <p className="font-bold text-brand-ink mb-1">🛵 طيارين مطعمك</p>
        الطيارين اللي بتضيفهم هنا بيشوفوا طلبات مطعمك بس، وبيدخلوا من صفحة{' '}
        <span className="font-bold" dir="ltr">terbwya.com/rider/login</span>{' '}
        بالإيميل وكلمة السر اللي هتحددهم. طلباتك بتظهر برضو لأسطول طيارين ترباوية في مدينتك.
      </div>

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-brand-red font-bold text-sm hover:underline"
        >
          <Plus size={16} /> ضيف طيار جديد
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم الطيار"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم موبايله"
            dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="إيميل الدخول"
              dir="ltr"
              className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              placeholder="كلمة السر"
              dir="ltr"
              className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="flex items-center gap-1 bg-brand-red text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <Check size={14} /> {saving ? 'جاري الإضافة...' : 'إضافة'}
            </button>
            <button onClick={() => setAdding(false)} className="flex items-center gap-1 text-brand-ink/50 font-bold px-4 py-2 rounded-lg text-sm">
              <X size={14} /> إلغاء
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-brand-ink/50 text-sm">جاري التحميل...</p>
      ) : riders.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-brand-ink/50 text-sm">
          <Bike className="w-8 h-8 mx-auto mb-2 text-brand-ink/20" />
          لسه معندكش طيارين خاصين — طلباتك بتظهر لأسطول ترباوية في مدينتك
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {riders.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-bold text-brand-ink text-sm">{r.name}</div>
                <div className="text-xs text-brand-ink/50" dir="ltr">{r.phone} · {r.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {r.status === 'suspended' ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">موقوف</span>
                ) : (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.is_online ? '🟢 متاح' : '⚪ مش متاح'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
