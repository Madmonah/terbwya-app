'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { pushSupported, subscribeToPush, getExistingSubscription } from '@/lib/pushClient';

// زر اشتراك العميل في إشعارات حالة طلبه — يوصله تنبيه حتى لو قفل الصفحة
export default function EnableOrderNotifications({
  reference,
  customerPhone,
}: {
  reference: string;
  customerPhone: string;
}) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    setSupported(true);
    getExistingSubscription().then((sub) => {
      if (sub && Notification.permission === 'granted') {
        // ممكن يكون مشترك على طلب تاني — التفعيل هنا هيعمل upsert عادي
      }
    });
  }, []);

  async function enable() {
    setWorking(true);
    try {
      const sub = await subscribeToPush();
      if (!sub) {
        toast.error('لازم توافق على الإشعارات من المتصفح');
        return;
      }
      const res = await fetch('/api/push/subscribe-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, phone: customerPhone, subscription: sub }),
      });
      if (!res.ok) throw new Error('subscribe_failed');
      setEnabled(true);
      toast.success('تمام! هيوصلك إشعار مع كل تحديث في طلبك 🔔');
    } catch (e) {
      console.error('[EnableOrderNotifications] error:', e);
      toast.error('حصل خطأ في تفعيل الإشعارات');
    } finally {
      setWorking(false);
    }
  }

  if (!supported || enabled) {
    return enabled ? (
      <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl py-2.5 px-4 text-sm font-bold mb-6">
        <BellRing className="w-4 h-4" /> هيوصلك إشعار مع كل تحديث في طلبك
      </div>
    ) : null;
  }

  return (
    <button
      onClick={enable}
      disabled={working}
      className="w-full flex items-center justify-center gap-2 bg-brand-orange text-white font-bold py-2.5 rounded-xl mb-6 disabled:opacity-50"
    >
      <Bell className="w-4 h-4" />
      {working ? 'جاري التفعيل...' : 'فعّل إشعارات حالة الطلب'}
    </button>
  );
}
