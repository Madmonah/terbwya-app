'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseAuthClient } from '@/lib/supabase';

export default function OwnerLoginPage() {
  const router = useRouter();

  // لو صاحب المطعم مسجّل دخول أصلاً — نوديه على داشبورد مطعمه على طول
  useEffect(() => {
    (async () => {
      try {
        const supa = getSupabaseAuthClient('owner');
        const { data: { session } } = await supa.auth.getSession();
        if (!session?.user) return;
        const { data: ownerRow } = await supa
          .from('restaurant_owners')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();
        if (!ownerRow) return;
        const { data: restaurant } = await supa
          .from('restaurants')
          .select('id')
          .eq('owner_id', ownerRow.id)
          .limit(1)
          .maybeSingle();
        if (restaurant) router.replace(`/owner/dashboard/${restaurant.id}`);
      } catch {}
    })();
  }, [router]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supa = getSupabaseAuthClient('owner');
      const { data, error: signInError } = await supa.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      if (!data.user) throw new Error('حصل خطأ');

      let { data: ownerRow, error: ownerError } = await supa
        .from('restaurant_owners')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (ownerError) throw ownerError;

      // حساب ناقص (اتعمل في Auth بس من غير صف صاحب المطعم)؟ نصلّحه أوتوماتيك
      // ونكمّل عادي بدل ما نقول له "سجّل حساب جديد" وهو مش هيعرف أصلاً
      if (!ownerRow) {
        const { data: repaired, error: repairError } = await supa
          .from('restaurant_owners')
          .insert({
            auth_user_id: data.user.id,
            business_name: data.user.email?.split('@')[0] || 'صاحب مطعم',
            email: data.user.email,
          })
          .select('id')
          .single();
        if (repairError) throw repairError;
        ownerRow = repaired;
      }

      const { data: restaurant } = await supa
        .from('restaurants')
        .select('id')
        .eq('owner_id', ownerRow!.id)
        .limit(1)
        .maybeSingle();

      toast.success('أهلاً بيك!');
      if (restaurant) {
        router.push(`/owner/dashboard/${restaurant.id}`);
      } else {
        router.push(`/join?owner=${ownerRow!.id}`);
      }
    } catch (e: any) {
      console.error('[owner/login] error:', e);
      setError('البريد الإلكتروني أو كلمة السر غلط');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-violet-700 to-violet-500 text-white">
        <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full bg-black/10 blur-3xl" />
        <div className="relative max-w-md mx-auto px-4 py-10 md:py-14 text-center">
          <span className="relative w-14 h-14 mx-auto mb-3 rounded-full bg-white/95 p-0.5 overflow-hidden block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-icon.png"
              alt="ترباوية"
              className="w-full h-full rounded-full object-cover scale-[1.55]"
            />
          </span>
          <h1 className="text-2xl font-extrabold">تسجيل دخول أصحاب المطاعم</h1>
        </div>
      </section>
      <main className="max-w-md mx-auto px-4 py-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="البريد الإلكتروني"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            dir="ltr"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="كلمة السر"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            dir="ltr"
          />

          {error && <p className="text-red-600 text-sm font-bold">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-extrabold py-3 rounded-xl hover:shadow-lg hover:shadow-brand-red/20 transition-all disabled:opacity-50"
          >
            {submitting ? 'جاري الدخول...' : 'دخول'}
          </button>

          <p className="text-xs text-center text-brand-ink/50">
            لسه معملتش حساب؟{' '}
            <Link href="/owner/signup" className="text-brand-red font-bold hover:underline">
              سجّل مطعمك
            </Link>
          </p>
        </form>
      </main>
      <Footer />
    </>
  );
}
