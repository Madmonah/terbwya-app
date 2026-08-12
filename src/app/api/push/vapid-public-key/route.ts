import { NextResponse } from 'next/server';
import { getVapidKeys } from '@/lib/webPush';

export const dynamic = 'force-dynamic';

// المفتاح العام لـ VAPID — عام بطبيعته (بيتبعت لكل متصفح بيشترك في الإشعارات)
// أول نداء بيولّد المفاتيح لو مش موجودة
export async function GET() {
  try {
    const { publicKey } = await getVapidKeys();
    return NextResponse.json({ publicKey });
  } catch (e) {
    console.error('[push/vapid-public-key] error:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
