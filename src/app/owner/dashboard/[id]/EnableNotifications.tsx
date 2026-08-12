'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabaseAuthClient } from '@/lib/supabase';
import { pushSupported, subscribeToPush, getExistingSubscription } from '@/lib/pushClient';

// زر تفعيل إشعارات الطلبات الجديدة لصاحب المطعم
export default function EnableNotifications({ restaurantId }: { restaurantId: string }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    setSupported(true);
    // لو المتصفح مشترك بالفعل، نعتبر الإشعارات مفعّلة
    getExistingSubscription().then((sub) => {
      if (sub && Notification.permission === 'granted') setEnabled(true);
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
      const supa = getSupabaseAuthClient();
      const { error } = await supa.from('push_subscriptions').upsert(
        {
          kind: 'owner',
          restaurant_id: restaurantId,
          order_id: null,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        { onConflict: 'endpoint' }
      );
      if (error) throw error;
      setEnabled(true);
      toast.success('تمام! هيوصلك إشعار مع كل طلب جديد 🔔');
    } catch (e) {
      console.error('[EnableNotifications] error:', e);
      toast.error('حصل خطأ في تفعيل الإشعارات');
    } finally {
      setWorking(false);
    }
  }

  if (!supported) return null;

  return (
    <button
      onClick={enable}
      disabled={working || enabled}
      className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
        enabled
          ? 'bg-white/20 text-white cursor-default'
          : 'bg-white text-brand-red hover:bg-white/90'
      }`}
    >
      {enabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
      {enabled ? 'الإشعارات شغالة' : working ? 'جاري التفعيل...' : 'فعّل إشعارات الطلبات'}
    </button>
  );
}
