import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// حسابات العمولات: لكل مطعم — الطلبات المُسلّمة، إجمالي المبيعات،
// وعمولة ترباوية المستحقة (الشهر الحالي + الإجمالي)
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const supa = getSupabaseAdminClient();
    const { data: orders, error } = await supa
      .from('orders')
      .select('restaurant_id, total_egp, delivery_fee_egp, commission_egp, delivered_at, restaurant:restaurants(name, commission_percent)')
      .eq('status', 'delivered')
      .limit(10000);
    if (error) throw error;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    type Entry = {
      restaurant_id: string;
      name: string;
      commission_percent: number;
      delivered_count: number;
      gross_egp: number;
      commission_total_egp: number;
      month_delivered_count: number;
      month_commission_egp: number;
    };
    const byRestaurant = new Map<string, Entry>();

    for (const o of orders || []) {
      const rest = o.restaurant as any;
      if (!o.restaurant_id) continue;
      const entry = byRestaurant.get(o.restaurant_id) || {
        restaurant_id: o.restaurant_id,
        name: rest?.name || '—',
        commission_percent: Number(rest?.commission_percent || 0),
        delivered_count: 0,
        gross_egp: 0,
        commission_total_egp: 0,
        month_delivered_count: 0,
        month_commission_egp: 0,
      };
      const foodValue = Number(o.total_egp || 0) - Number(o.delivery_fee_egp || 0);
      entry.delivered_count += 1;
      entry.gross_egp += foodValue;
      entry.commission_total_egp += Number(o.commission_egp || 0);
      if (o.delivered_at && new Date(o.delivered_at) >= monthStart) {
        entry.month_delivered_count += 1;
        entry.month_commission_egp += Number(o.commission_egp || 0);
      }
      byRestaurant.set(o.restaurant_id, entry);
    }

    const settlements = [...byRestaurant.values()].sort(
      (a, b) => b.commission_total_egp - a.commission_total_egp
    );

    return NextResponse.json({
      settlements,
      totals: {
        commission_total_egp: settlements.reduce((s, e) => s + e.commission_total_egp, 0),
        month_commission_egp: settlements.reduce((s, e) => s + e.month_commission_egp, 0),
      },
    });
  } catch (e) {
    console.error('[admin/settlements] error:', e);
    return NextResponse.json({ error: 'حصل خطأ في تحميل الحسابات' }, { status: 500 });
  }
}
