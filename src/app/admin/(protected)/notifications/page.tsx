'use client';

import { useEffect, useState } from 'react';
import { Send, Bell, Users, UserCircle, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

type LogEntry = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  audience: string;
  sent_count: number;
  created_at: string;
};

const AUDIENCES = [
  { value: 'all', label: 'الكل', icon: Globe, desc: 'كل المشتركين في الإشعارات' },
  { value: 'owners', label: 'أصحاب المطاعم', icon: UserCircle, desc: 'المشتركين من داشبورد المطاعم' },
  { value: 'customers', label: 'العملاء', icon: Users, desc: 'المشتركين من صفحات تتبع الطلبات' },
];

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'الكل',
  owners: 'أصحاب المطاعم',
  customers: 'العملاء',
};

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);

  async function loadLog() {
    try {
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setLog(data.notifications || []);
    } finally {
      setLoadingLog(false);
    }
  }

  useEffect(() => {
    loadLog();
  }, []);

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error('العنوان والنص مطلوبين');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url: url || null, audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.total === 0) {
        toast('مفيش مشتركين في الجمهور ده لسه', { icon: 'ℹ️' });
      } else {
        toast.success(`اتبعت الإشعار لـ ${data.sent} من ${data.total} مشترك 🔔`);
      }
      setTitle('');
      setBody('');
      setUrl('');
      loadLog();
    } catch (e: any) {
      toast.error(e.message || 'حصل خطأ في الإرسال');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-extrabold text-brand-ink mb-6">إرسال إشعار</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* نموذج الإرسال */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-ink/60 mb-2">الجمهور</label>
            <div className="grid grid-cols-3 gap-2">
              {AUDIENCES.map((a) => {
                const Icon = a.icon;
                const active = audience === a.value;
                return (
                  <button
                    key={a.value}
                    onClick={() => setAudience(a.value)}
                    className={`rounded-xl border p-3 text-center transition-colors ${
                      active
                        ? 'border-brand-red bg-violet-50 text-brand-red'
                        : 'border-gray-200 text-brand-ink/60 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-bold block">{a.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-brand-ink/40 mt-1.5">
              {AUDIENCES.find((a) => a.value === audience)?.desc}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-ink/60 mb-1.5">عنوان الإشعار</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً: عروض اليوم وصلت 🔥"
              maxLength={60}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-ink/60 mb-1.5">نص الإشعار</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="مثلاً: خصومات لحد 50% من مطاعم مختارة — اطلب دلوقتي"
              maxLength={180}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-ink/60 mb-1.5">
              الرابط عند الضغط (اختياري)
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/restaurants أو /offers"
              dir="ltr"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          {/* معاينة */}
          {(title || body) && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-[10px] font-bold text-brand-ink/40 mb-2 uppercase tracking-wider">معاينة</p>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-brand-red" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-brand-ink truncate">{title || 'عنوان الإشعار'}</p>
                  <p className="text-xs text-brand-ink/60">{body || 'نص الإشعار'}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full flex items-center justify-center gap-2 bg-brand-red text-white font-extrabold py-3 rounded-xl disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
          </button>
        </div>

        {/* السجل */}
        <div>
          <h2 className="font-bold text-brand-ink text-sm mb-3">آخر الإشعارات المُرسلة</h2>
          {loadingLog && <p className="text-brand-ink/50 text-sm">جاري التحميل...</p>}
          {!loadingLog && log.length === 0 && (
            <p className="text-brand-ink/50 bg-white rounded-xl p-8 text-center text-sm">
              لسه مبعتش أي إشعارات
            </p>
          )}
          <div className="space-y-2.5">
            {log.map((n) => (
              <div key={n.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-brand-ink text-sm">{n.title}</p>
                    <p className="text-xs text-brand-ink/60 mt-0.5">{n.body}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-50 text-brand-red shrink-0">
                    {AUDIENCE_LABELS[n.audience] || n.audience}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-brand-ink/40">
                  <span>وصل لـ {n.sent_count} مشترك</span>
                  <span>{new Date(n.created_at).toLocaleString('ar-EG')}</span>
                  {n.url && n.url !== '/' && <span dir="ltr">{n.url}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
