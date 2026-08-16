import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const supa = getSupabaseAdminClient();
    const { data, error } = await supa
      .from('orders')
      .select(
        'id,reference,status,payment_method,subtotal_egp,delivery_fee_egp,total_egp,customer_name,customer_phone,city,district,created_at,rider:riders(id,name,phone),restaurant:restaurants(id,name,slug)'
      )
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;
    return NextResponse.json({ orders: data || [] });
  } catch (e) {
    console.error('[api/admin/orders] error:', e);
    return NextResponse.json({ error: 'تعذّر تحميل الطلبات' }, { status: 500 });
  }
}
