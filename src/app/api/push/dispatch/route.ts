import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { sendPushToSubscriptions, PushRow } from '@/lib/webPush';

export const dynamic = 'force-dynamic';

// خريطة رسائل حالات الطلب للعميل
const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  confirmed: { title: '✅ اتأكد طلبك', body: 'المطعم أكّد طلبك وبدأ التحضير قريبًا' },
  preparing: { title: '👨‍🍳 طلبك بيتحضّر', body: 'المطعم بيحضّر طلبك دلوقتي' },
  out_for_delivery: { title: '🛵 طلبك في الطريق', body: 'الأوردر خرج للتوصيل — جهّز الكاش!' },
  delivered: { title: '🎉 طلبك وصل', body: 'بالهنا والشفا! قيّم تجربتك من صفحة الطلب' },
  cancelled: { title: '❌ اتلغى الطلب', body: 'للأسف الطلب اتلغى. تقدر تطلب من مطعم تاني' },
};

// الأمان هنا مش محتاج secret: الـ endpoint بياخد بس order_id (UUID مش قابل
// للتخمين) وبيرجع يقرا كل البيانات من الداتابيز نفسها — يعني أسوأ حاجة ممكن
// حد يعملها لو عرف UUID طلب هي إعادة إرسال إشعار حقيقي، مش تزوير محتوى.
export async function POST(req: NextRequest) {
  try {
    const { order_id, event } = await req.json();
    if (!order_id || !event || !['new_order', 'status_change', 'rider_available_order'].includes(event)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const supa = getSupabaseAdminClient();
    const { data: order } = await supa
      .from('orders')
      .select('id, reference, status, total_egp, delivery_fee_egp, rider_id, restaurant_id, created_at, restaurant:restaurants(name, city)')
      .eq('id', order_id)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
    }

    let sent = 0;

    if (event === 'new_order') {
      // حماية من إعادة الإرسال: إشعار "طلب جديد" بيتبعت بس لو الطلب لسه جديد فعلاً
      const ageMs = Date.now() - new Date(order.created_at).getTime();
      if (ageMs > 15 * 60 * 1000) {
        return NextResponse.json({ skipped: 'order_too_old' });
      }

      const { data: subs } = await supa
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('kind', 'owner')
        .eq('restaurant_id', order.restaurant_id);

      sent = await sendPushToSubscriptions((subs || []) as PushRow[], {
        title: '🔔 طلب جديد!',
        body: `طلب #${order.reference} بقيمة ${Number(order.total_egp).toLocaleString('ar-EG')} ج.م — افتح الداشبورد وأكّده`,
        url: `/owner/dashboard/${order.restaurant_id}`,
        tag: `new-order-${order.id}`,
      });
    } else if (event === 'rider_available_order') {
      // طلب اتأكد ولسه من غير طيار → إشعار للطيارين المؤهلين:
      // طيارين المطعم نفسه + أسطول المنصة المتاح في نفس المدينة
      if (order.rider_id) {
        return NextResponse.json({ skipped: 'already_assigned' });
      }
      if (!['confirmed', 'preparing'].includes(order.status)) {
        return NextResponse.json({ skipped: 'not_available_status' });
      }

      const restaurantCity = (order.restaurant as any)?.city || null;
      const { data: eligibleRiders } = await supa
        .from('riders')
        .select('id, restaurant_id, city')
        .eq('status', 'active')
        .eq('is_online', true);

      const riderIds = (eligibleRiders || [])
        .filter(
          (r: any) =>
            r.restaurant_id === order.restaurant_id ||
            (r.restaurant_id === null && (r.city === null || r.city === restaurantCity))
        )
        .map((r: any) => r.id);

      if (riderIds.length === 0) {
        return NextResponse.json({ sent: 0, note: 'no_eligible_riders' });
      }

      const { data: subs } = await supa
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('kind', 'rider')
        .in('rider_id', riderIds);

      const restaurantName = (order.restaurant as any)?.name;
      sent = await sendPushToSubscriptions((subs || []) as PushRow[], {
        title: '🛵 طلب جديد متاح للتوصيل!',
        body: `من ${restaurantName || 'مطعم'} — أرباحك ${Number(order.delivery_fee_egp).toLocaleString('ar-EG')} ج.م. اقبله قبل غيرك!`,
        url: '/rider/dashboard',
        tag: `rider-order-${order.id}`,
      });
    } else {
      // status_change: إشعار للعميل المشترك على الطلب ده بحالته الحالية من الداتابيز
      const msg = STATUS_MESSAGES[order.status];
      if (!msg) {
        return NextResponse.json({ skipped: 'no_message_for_status' });
      }

      const { data: subs } = await supa
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('kind', 'customer')
        .eq('order_id', order.id);

      const restaurantName = (order.restaurant as any)?.name;
      sent = await sendPushToSubscriptions((subs || []) as PushRow[], {
        title: msg.title,
        body: `${msg.body}${restaurantName ? ` — ${restaurantName}` : ''}`,
        url: `/order/${order.reference}`,
        tag: `order-status-${order.id}`,
      });
    }

    return NextResponse.json({ sent });
  } catch (e) {
    console.error('[push/dispatch] error:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
