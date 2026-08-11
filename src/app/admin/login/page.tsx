'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حصل خطأ');
        setSubmitting(false);
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('تعذّر الاتصال بالسيرفر');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900 via-violet-700 to-violet-500 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-xl font-extrabold text-center text-brand-ink mb-1">لوحة تحكم ترباوية</h1>
        <p className="text-sm text-center text-brand-ink/50 mb-6">دخول الأدمن فقط</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="البريد الإلكتروني"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            dir="ltr"
            autoComplete="username"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="كلمة السر"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            dir="ltr"
            autoComplete="current-password"
          />
          {error && <p className="text-red-600 text-sm font-bold">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-extrabold py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
          >
            {submitting ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
