import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// تحليلات لوحة الأدمن: آخر 30 يوم — طلبات يومية، إيراد يومي، توزيع الحالات،
// وأفضل المطاعم أداءً
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const supa = getSupabaseAdminClient();
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data: orders, error } = await supa
      .from('orders')
      .select('id, status, total_egp, created_at, restaurant:restaurants(id, name)')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
      .limit(5000);
    if (error) throw error;

    // سلسلة الأيام الثلاثين
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const ordersByDay = new Map<string, number>();
    const revenueByDay = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    const restaurantRevenue = new Map<string, { name: string; revenue: number; orders: number }>();

    for (const o of orders || []) {
      const day = String(o.created_at).slice(0, 10);
      ordersByDay.set(day, (ordersByDay.get(day) || 0) + 1);
      statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);

      const rest = o.restaurant as any;
      if (rest?.id) {
        const entry = restaurantRevenue.get(rest.id) || { name: rest.name, revenue: 0, orders: 0 };
        entry.orders += 1;
        if (o.status === 'delivered') entry.revenue += Number(o.total_egp || 0);
        restaurantRevenue.set(rest.id, entry);
      }

      if (o.status === 'delivered') {
        revenueByDay.set(day, (revenueByDay.get(day) || 0) + Number(o.total_egp || 0));
      }
    }

    const fmt = (iso: string) => {
      const d = new Date(iso + 'T00:00:00Z');
      return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric' });
    };

    return NextResponse.json({
      dailyOrders: days.map((d) => ({ label: fmt(d), value: ordersByDay.get(d) || 0 })),
      dailyRevenue: days.map((d) => ({ label: fmt(d), value: revenueByDay.get(d) || 0 })),
      statusCounts: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
      topRestaurants: [...restaurantRevenue.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 7)
        .map((r) => ({ label: r.name, value: r.revenue })),
      busiestRestaurants: [...restaurantRevenue.values()]
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 7)
        .map((r) => ({ label: r.name, value: r.orders })),
    });
  } catch (e) {
    console.error('[admin/analytics] error:', e);
    return NextResponse.json({ error: 'حصل خطأ في تحميل التحليلات' }, { status: 500 });
  }
}
