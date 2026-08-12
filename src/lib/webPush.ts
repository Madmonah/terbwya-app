import webpush from 'web-push';
import { getSupabaseAdminClient } from './supabase';

// مفاتيح VAPID: بتتولّد أوتوماتيك أول مرة وبتتخزن في جدول app_secrets
// (مقفول بالكامل — service_role بس). ينفع برضو تتحط كـ env vars لو حبينا.
let cachedKeys: { publicKey: string; privateKey: string } | null = null;

export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (cachedKeys) return cachedKeys;

  const envPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  if (envPub && envPriv) {
    cachedKeys = { publicKey: envPub, privateKey: envPriv };
    return cachedKeys;
  }

  const supa = getSupabaseAdminClient();
  const read = async () => {
    const { data } = await supa
      .from('app_secrets')
      .select('key, value')
      .in('key', ['vapid_public_key', 'vapid_private_key']);
    const map = new Map((data || []).map((r: any) => [r.key, r.value]));
    const pub = map.get('vapid_public_key');
    const priv = map.get('vapid_private_key');
    return pub && priv ? { publicKey: pub, privateKey: priv } : null;
  };

  let keys = await read();
  if (!keys) {
    // أول تشغيل: نولّد المفاتيح ونخزنها. ignoreDuplicates بتحمينا لو
    // طلبين وصلوا في نفس اللحظة — اللي يكسب السباق مفاتيحه هي اللي تتخزن.
    const generated = webpush.generateVAPIDKeys();
    await supa.from('app_secrets').upsert(
      [
        { key: 'vapid_public_key', value: generated.publicKey },
        { key: 'vapid_private_key', value: generated.privateKey },
      ],
      { onConflict: 'key', ignoreDuplicates: true }
    );
    keys = await read();
    if (!keys) throw new Error('Failed to initialize VAPID keys');
  }

  cachedKeys = keys;
  return cachedKeys;
}

export async function getConfiguredWebPush() {
  const keys = await getVapidKeys();
  webpush.setVapidDetails('mailto:moh91arabco@gmail.com', keys.publicKey, keys.privateKey);
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
  const wp = await getConfiguredWebPush();
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
