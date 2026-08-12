import webpush from 'web-push';
import { getSupabaseAdminClient } from './supabase';

// إعداد web-push بمفاتيح VAPID — يتستخدم فقط في API routes على السيرفر
let configured = false;
export function getWebPush() {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      throw new Error('Missing VAPID env vars: NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
    }
    webpush.setVapidDetails('mailto:moh91arabco@gmail.com', publicKey, privateKey);
    configured = true;
  }
  return webpush;
}

export type PushRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// إرسال إشعار لمجموعة اشتراكات، مع حذف الاشتراكات الميتة (404/410) تلقائيًا
export async function sendPushToSubscriptions(
  subs: PushRow[],
  payload: { title: string; body: string; url: string; tag?: string }
): Promise<number> {
  if (subs.length === 0) return 0;
  const wp = getWebPush();
  const supa = getSupabaseAdminClient();
  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        sent++;
      } catch (e: any) {
        const status = e?.statusCode;
        if (status === 404 || status === 410) {
          // اشتراك ميت — امسحه عشان منحاولش تاني
          await supa.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    })
  );

  return sent;
}
