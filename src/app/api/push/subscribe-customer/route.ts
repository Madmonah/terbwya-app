import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// اشتراك العميل في إشعارات طلب معيّن: لازم reference + رقم الموبايل يتطابقوا
// (نفس منطق الحماية بتاع صفحة تتبع الطلب)
export async function POST(req: NextRequest) {
  try {
    const { reference, phone, subscription } = await req.json();
    if (
      !reference ||
      !phone ||
      !subscription?.endpoint ||
      !subscription?.p256dh ||
      !subscription?.auth
    ) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const supa = getSupabaseAdminClient();
    const { data: order } = await supa
      .from('orders')
      .select('id, customer_phone')
      .eq('reference', reference)
      .maybeSingle();

    if (!order || order.customer_phone !== phone) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // upsert على الـ endpoint: نفس المتصفح يتحدث اشتراكه بدل ما يتكرر
    const { error } = await supa.from('push_subscriptions').upsert(
      {
        kind: 'customer',
        order_id: order.id,
        restaurant_id: null,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      { onConflict: 'endpoint' }
    );
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[push/subscribe-customer] error:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
