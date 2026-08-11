'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Owner = {
  id: string;
  business_name: string;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  kyc_status: string;
  created_at: string;
  restaurants: { id: string; name: string; status: string }[] | null;
};

const KYC_LABELS: Record<string, string> = {
  pending: 'في الانتظار',
  verified: 'موثّق',
  rejected: 'مرفوض',
};

const KYC_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/owners', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setOwners(data.owners || []);
      } catch (e: any) {
        toast.error(e.message || 'تعذّر تحميل أصحاب المطاعم');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-extrabold text-brand-ink mb-6">أصحاب المطاعم ({owners.length})</h1>

      {loading && <p className="text-brand-ink/50">جاري التحميل...</p>}
      {!loading && owners.length === 0 && (
        <p className="text-brand-ink/50 bg-white rounded-xl p-8 text-center">مفيش أصحاب مطاعم مسجلين لسه</p>
      )}

      <div className="space-y-3">
        {owners.map((o) => (
          <div key={o.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-brand-ink">{o.business_name}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${KYC_COLORS[o.kyc_status] || ''}`}>
                    {KYC_LABELS[o.kyc_status] || o.kyc_status}
                  </span>
                </div>
                <p className="text-xs text-brand-ink/50 mt-1" dir="ltr">
                  {o.email || '—'} {o.phone ? `· ${o.phone}` : ''}
                </p>
                <p className="text-xs text-brand-ink/40 mt-1">
                  {(o.restaurants || []).length > 0
                    ? `مطاعمه: ${o.restaurants!.map((r) => r.name).join('، ')}`
                    : 'لسه مسجّلش مطعم'}
                </p>
              </div>
              <p className="text-xs text-brand-ink/40">
                {new Date(o.created_at).toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
