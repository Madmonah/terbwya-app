'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseAuthClient } from '@/lib/supabase';

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supa = getSupabaseAuthClient();
      const { data, error: signInError } = await supa.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      if (!data.user) throw new Error('حصل خطأ');

      const { data: ownerRow, error: ownerError } = await supa
        .from('restaurant_owners')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (ownerError) throw ownerError;
      if (!ownerRow) {
        setError('الحساب ده مش مسجّل كصاحب مطعم. سجّل حساب جديد.');
        setSubmitting(false);
        return;
      }

      const { data: restaurant } = await supa
        .from('restaurants')
        .select('id')
        .eq('owner_id', ownerRow.id)
        .limit(1)
        .maybeSingle();

      toast.success('أهلاً بيك!');
      if (restaurant) {
        router.push(`/owner/dashboard/${restaurant.id}`);
      } else {
        router.push(`/join?owner=${ownerRow.id}`);
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
      <main className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-extrabold text-brand-ink mb-8">تسجيل دخول أصحاب المطاعم</h1>

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
            className="w-full bg-brand-red text-white font-extrabold py-3 rounded-xl hover:bg-brand-red-dark transition-colors disabled:opacity-50"
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
