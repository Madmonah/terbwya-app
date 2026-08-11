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
      .from('customers')
      .select('id,name,phone,whatsapp_number,email,created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;
    return NextResponse.json({ customers: data || [] });
  } catch (e) {
    console.error('[api/admin/customers] error:', e);
    return NextResponse.json({ error: 'تعذّر تحميل العملاء' }, { status: 500 });
  }
}
