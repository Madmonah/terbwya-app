'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Bike } from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';

const CITIES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الساحل الشمالي',
  'العين السخنة', 'الغردقة', 'شرم الشيخ', 'المنصورة', 'طنطا',
  'الزقازيق', 'الفيوم', 'أسيوط', 'مدينة 6 أكتوبر', 'أخرى',
];

const VEHICLES = [
  { value: 'motorcycle', label: '🏍️ موتوسيكل' },
  { value: 'bicycle', label: '🚲 عجلة' },
  { value: 'car', label: '🚗 عربية' },
];

export default function RiderSignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('الاسم مطلوب');
    if (!/^01[0-9]{9}$/.test(phone.replace(/\D/g, ''))) {
      return setError('رقم موبايل غير صحيح. لازم يبدأ بـ 01 ويبقى 11 رقم');
    }
    if (!city) return setError('اختار مدينتك');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('بريد إلكتروني غير صحيح');
    if (password.length < 6) return setError('كلمة السر لازم تكون 6 حروف/أرقام على الأقل');

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'rider',
          name: name.trim(),
          phone,
          city,
          vehicleType,
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errors: Record<string, string> = {
          email_exists: 'الإيميل ده مسجل قبل كده بكلمة سر مختلفة — سجّل دخول بدل كده',
          invalid_phone: 'رقم موبايل غير صحيح',
          invalid_email: 'بريد إلكتروني غير صحيح',
          weak_password: 'كلمة السر لازم تكون 6 حروف/أرقام على الأقل',
        };
        setError(errors[data.error] || 'حصل خطأ، حاول تاني');
        return;
      }

      const supa = getSupabaseAuthClient();
      const { error: signInError } = await supa.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      toast.success('اتسجّل حسابك! هنراجعه ونفعّله قريب');
      router.push('/rider/dashboard');
    } catch (e) {
      console.error('[rider/signup] error:', e);
      setError('حصل خطأ، حاول تاني');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream" dir="rtl">
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-violet-700 to-violet-500 text-white">
        <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-md mx-auto px-4 py-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/95 flex items-center justify-center">
            <Bike className="w-7 h-7 text-brand-red" />
          </div>
          <h1 className="text-2xl font-extrabold">انضم كطيار في ترباوية</h1>
          <p className="text-white/85 text-sm mt-2">
            وصّل طلبات في مدينتك واكسب رسوم التوصيل كاملة — أنت اللي بتختار طلباتك ووقتك.
          </p>
        </div>
      </section>

      <main className="max-w-md mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم بالكامل *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم الموبايل *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            dir="ltr"
          />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white"
          >
            <option value="">المدينة اللي هتشتغل فيها *</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex gap-2">
            {VEHICLES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setVehicleType(v.value)}
                className={`flex-1 rounded-lg border py-2 text-sm font-bold transition-colors ${
                  vehicleType === v.value
                    ? 'border-brand-red bg-violet-50 text-brand-red'
                    : 'border-gray-200 text-brand-ink/60'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="البريد الإلكتروني *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            dir="ltr"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="كلمة السر (٦ حروف/أرقام على الأقل) *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            dir="ltr"
          />

          {error && <p className="text-red-600 text-sm font-bold">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-extrabold py-3 rounded-xl disabled:opacity-50"
          >
            {submitting ? 'جاري التسجيل...' : 'سجّل كطيار'}
          </button>

          <p className="text-xs text-center text-brand-ink/50">
            عندك حساب بالفعل؟{' '}
            <Link href="/rider/login" className="text-brand-red font-bold hover:underline">
              سجّل دخول
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
