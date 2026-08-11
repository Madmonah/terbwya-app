import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const supa = getSupabaseAdminClient();

    const [
      { count: restaurantsTotal },
      { count: restaurantsPending },
      { count: restaurantsPublished },
      { count: ordersTotal },
      { count: ownersTotal },
      { count: customersTotal },
      { data: revenueRows },
    ] = await Promise.all([
      supa.from('restaurants').select('id', { count: 'exact', head: true }),
      supa.from('restaurants').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supa.from('restaurants').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supa.from('orders').select('id', { count: 'exact', head: true }),
      supa.from('restaurant_owners').select('id', { count: 'exact', head: true }),
      supa.from('customers').select('id', { count: 'exact', head: true }),
      supa.from('orders').select('total_egp').eq('status', 'delivered'),
    ]);

    const totalRevenue = (revenueRows || []).reduce((sum, o) => sum + Number(o.total_egp || 0), 0);

    return NextResponse.json({
      restaurantsTotal: restaurantsTotal || 0,
      restaurantsPending: restaurantsPending || 0,
      restaurantsPublished: restaurantsPublished || 0,
      ordersTotal: ordersTotal || 0,
      ownersTotal: ownersTotal || 0,
      customersTotal: customersTotal || 0,
      totalRevenueEgp: totalRevenue,
    });
  } catch (e) {
    console.error('[api/admin/stats] error:', e);
    return NextResponse.json({ error: 'تعذّر تحميل الإحصائيات' }, { status: 500 });
  }
}
