import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { sendPushToSubscriptions, PushRow } from '@/lib/webPush';

export const dynamic = 'force-dynamic';

// سجل الإشعارات المُرسلة
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const supa = getSupabaseAdminClient();
    const { data, error } = await supa
      .from('notifications_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ notifications: data || [] });
  } catch (e) {
    console.error('[admin/notifications] GET error:', e);
    return NextResponse.json({ error: 'حصل خطأ في تحميل السجل' }, { status: 500 });
  }
}

// إرسال إشعار مخصص لجمهور محدد
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { title, body, url, audience } = await req.json();

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'العنوان والنص مطلوبين' }, { status: 400 });
    }
    if (!['all', 'owners', 'customers'].includes(audience)) {
      return NextResponse.json({ error: 'جمهور غير صحيح' }, { status: 400 });
    }

    const supa = getSupabaseAdminClient();
    let query = supa.from('push_subscriptions').select('id, endpoint, p256dh, auth');
    if (audience === 'owners') query = query.eq('kind', 'owner');
    if (audience === 'customers') query = query.eq('kind', 'customer');

    const { data: subs, error } = await query;
    if (error) throw error;

    const targetUrl = url?.trim() || '/';
    const sent = await sendPushToSubscriptions((subs || []) as PushRow[], {
      title: title.trim(),
      body: body.trim(),
      url: targetUrl,
    });

    await supa.from('notifications_log').insert({
      title: title.trim(),
      body: body.trim(),
      url: targetUrl,
      audience,
      sent_count: sent,
    });

    return NextResponse.json({ sent, total: (subs || []).length });
  } catch (e) {
    console.error('[admin/notifications] POST error:', e);
    return NextResponse.json({ error: 'حصل خطأ في الإرسال' }, { status: 500 });
  }
}
