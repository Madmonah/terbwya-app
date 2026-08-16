'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Bike } from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';

export default function RiderLoginPage() {
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

      const { data: riderRow } = await supa
        .from('riders')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (!riderRow) {
        setError('الحساب ده مش مسجّل كطيار. سجّل كطيار الأول.');
        setSubmitting(false);
        return;
      }

      toast.success('أهلاً بيك!');
      router.push('/rider/dashboard');
    } catch {
      setError('البريد الإلكتروني أو كلمة السر غلط');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream" dir="rtl">
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-violet-700 to-violet-500 text-white">
        <div className="relative max-w-md mx-auto px-4 py-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/95 flex items-center justify-center">
            <Bike className="w-7 h-7 text-brand-red" />
          </div>
          <h1 className="text-2xl font-extrabold">تسجيل دخول الطيارين</h1>
        </div>
      </section>

      <main className="max-w-md mx-auto px-4 py-8">
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
            className="w-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-extrabold py-3 rounded-xl disabled:opacity-50"
          >
            {submitting ? 'جاري الدخول...' : 'دخول'}
          </button>

          <p className="text-xs text-center text-brand-ink/50">
            لسه مسجلتش؟{' '}
            <Link href="/rider/signup" className="text-brand-red font-bold hover:underline">
              انضم كطيار
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
