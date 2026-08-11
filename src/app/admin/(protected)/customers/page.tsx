'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Customer = {
  id: string;
  name: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  created_at: string;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/customers', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCustomers(data.customers || []);
      } catch (e: any) {
        toast.error(e.message || 'تعذّر تحميل العملاء');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-extrabold text-brand-ink mb-6">العملاء ({customers.length})</h1>

      {loading && <p className="text-brand-ink/50">جاري التحميل...</p>}
      {!loading && customers.length === 0 && (
        <p className="text-brand-ink/50 bg-white rounded-xl p-8 text-center">مفيش عملاء مسجلين لسه</p>
      )}

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-brand-ink/50 text-xs border-b border-gray-100">
              <th className="p-3 font-semibold">الاسم</th>
              <th className="p-3 font-semibold">الموبايل</th>
              <th className="p-3 font-semibold">الإيميل</th>
              <th className="p-3 font-semibold">تاريخ التسجيل</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0">
                <td className="p-3">{c.name || '—'}</td>
                <td className="p-3" dir="ltr">
                  {c.phone || '—'}
                </td>
                <td className="p-3" dir="ltr">
                  {c.email || '—'}
                </td>
                <td className="p-3 text-xs text-brand-ink/50">
                  {new Date(c.created_at).toLocaleDateString('ar-EG')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
