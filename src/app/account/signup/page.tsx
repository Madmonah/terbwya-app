'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseAuthClient } from '@/lib/supabase';

export default function AccountSignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('الاسم مطلوب');
      return;
    }
    if (!/^01[0-9]{9}$/.test(phone.replace(/\D/g, ''))) {
      setError('رقم موبايل غير صحيح. لازم يبدأ بـ 01 ويبقى 11 رقم');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('بريد إلكتروني غير صحيح');
      return;
    }
    if (password.length < 6) {
      setError('كلمة السر لازم تكون 6 حروف/أرقام على الأقل');
      return;
    }

    setSubmitting(true);
    try {
      // التسجيل بيتم سيرفر-سايد بحساب مُأكّد فورًا — مفيش إيميل تأكيد خالص
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'customer',
          name: name.trim(),
          phone,
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errors: Record<string, string> = {
          email_exists: 'الإيميل ده مسجل قبل كده بكلمة سر مختلفة — سجّل دخول بدل كده',
          invalid_phone: 'رقم موبايل غير صحيح. لازم يبدأ بـ 01 ويبقى 11 رقم',
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

      toast.success('أهلاً بيك في ترباوية! 🎉');
      router.push('/restaurants');
    } catch (e: any) {
      console.error('[account/signup] error:', e);
      setError('حصل خطأ، حاول تاني');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-extrabold text-brand-ink mb-2">اعمل حساب في ترباوية</h1>
        <p className="text-brand-ink/60 mb-8 text-sm">
          احفظ مطاعمك المفضلة، وراجع طلباتك السابقة، واطلب تاني بضغطة واحدة.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم موبايل *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            dir="ltr"
          />
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
            className="w-full bg-brand-red text-white font-extrabold py-3 rounded-xl hover:bg-brand-red-dark transition-colors disabled:opacity-50"
          >
            {submitting ? 'جاري التسجيل...' : 'إنشاء الحساب'}
          </button>

          <p className="text-xs text-center text-brand-ink/50">
            عندك حساب بالفعل؟{' '}
            <Link href="/account/login" className="text-brand-red font-bold hover:underline">
              سجّل دخول
            </Link>
          </p>
        </form>
      </main>
      <Footer />
    </>
  );
}
