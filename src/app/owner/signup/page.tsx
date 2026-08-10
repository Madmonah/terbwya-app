'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseAuthClient } from '@/lib/supabase';

export default function OwnerSignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) {
      setError('اسم المطعم أو النشاط مطلوب');
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
      const supa = getSupabaseAuthClient();

      const { data: signUpData, error: signUpError } = await supa.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('حصل خطأ في إنشاء الحساب');

      // لو مفعّل تأكيد الإيميل في المشروع، هيبقى فيه session بعد التأكيد بس.
      // نحاول نعمل login مباشر لو مفيش session (بعض إعدادات Supabase بتديك session فورًا).
      let userId = signUpData.user.id;
      if (!signUpData.session) {
        const { data: signInData, error: signInError } = await supa.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          // التأكيد بالإيميل مفعّل — هنعرض رسالة توضيحية
          toast.success('اتسجّل حسابك! تحقق من بريدك الإلكتروني لتأكيد الحساب، بعدين سجّل دخول.');
          router.push('/owner/login');
          return;
        }
        userId = signInData.user?.id || userId;
      }

      const { data: ownerRow, error: ownerError } = await supa
        .from('restaurant_owners')
        .insert({
          auth_user_id: userId,
          business_name: businessName.trim(),
          phone: phone.replace(/\D/g, ''),
          whatsapp_number: phone.replace(/\D/g, ''),
          email: email.trim(),
        })
        .select('id')
        .single();

      if (ownerError) throw ownerError;

      toast.success('اتسجّل حسابك بنجاح! دلوقتي ضيف بيانات مطعمك');
      router.push(`/join?owner=${ownerRow.id}`);
    } catch (e: any) {
      console.error('[owner/signup] error:', e);
      setError(e?.message?.includes('already registered') ? 'الإيميل ده مسجل قبل كده، سجّل دخول بدل كده' : 'حصل خطأ، حاول تاني');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-800 via-sky-600 to-sky-400 text-white">
        <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full bg-black/10 blur-3xl" />
        <div className="relative max-w-md mx-auto px-4 py-10 md:py-14 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.svg" alt="" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold">سجّل حساب مطعمك</h1>
          <p className="text-white/85 text-sm mt-2">
            هيبقى عندك داشبورد تقدر تدير بيه منيو مطعمك والطلبات اللي بتيجيلك.
          </p>
        </div>
      </section>
      <main className="max-w-md mx-auto px-4 py-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="اسم المطعم *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم موبايل/واتساب *"
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
            className="w-full bg-gradient-to-br from-sky-400 to-sky-600 text-white font-extrabold py-3 rounded-xl hover:shadow-lg hover:shadow-brand-red/20 transition-all disabled:opacity-50"
          >
            {submitting ? 'جاري التسجيل...' : 'إنشاء الحساب'}
          </button>

          <p className="text-xs text-center text-brand-ink/50">
            عندك حساب بالفعل؟{' '}
            <Link href="/owner/login" className="text-brand-red font-bold hover:underline">
              سجّل دخول
            </Link>
          </p>
        </form>
      </main>
      <Footer />
    </>
  );
}
