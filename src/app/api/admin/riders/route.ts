import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// كل الطيارين (أسطول المنصة + طيارين المطاعم) مع إحصائيات توصيلهم
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const supa = getSupabaseAdminClient();
    const { data: riders, error } = await supa
      .from('riders')
      .select('*, restaurant:restaurants(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // إحصائيات التوصيل لكل طيار (أرباح الطيار الصافية + عمولة المنصة منه)
    const { data: stats } = await supa
      .from('orders')
      .select('rider_id, delivery_fee_egp, rider_commission_egp')
      .eq('status', 'delivered')
      .not('rider_id', 'is', null);

    const deliveredByRider = new Map<string, { count: number; earnings: number; platform: number }>();
    for (const o of stats || []) {
      const entry = deliveredByRider.get(o.rider_id) || { count: 0, earnings: 0, platform: 0 };
      const commission = Number(o.rider_commission_egp || 0);
      entry.count += 1;
      entry.earnings += Math.max(Number(o.delivery_fee_egp || 0) - commission, 0);
      entry.platform += commission;
      deliveredByRider.set(o.rider_id, entry);
    }

    return NextResponse.json({
      riders: (riders || []).map((r: any) => ({
        ...r,
        delivered_count: deliveredByRider.get(r.id)?.count || 0,
        total_earnings: deliveredByRider.get(r.id)?.earnings || 0,
        platform_commission_total: deliveredByRider.get(r.id)?.platform || 0,
      })),
    });
  } catch (e) {
    console.error('[admin/riders] GET error:', e);
    return NextResponse.json({ error: 'حصل خطأ في تحميل الطيارين' }, { status: 500 });
  }
}
