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
      .from('restaurant_owners')
      .select('id,business_name,phone,whatsapp_number,email,kyc_status,created_at,restaurants(id,name,status)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ owners: data || [] });
  } catch (e) {
    console.error('[api/admin/owners] error:', e);
    return NextResponse.json({ error: 'تعذّر تحميل أصحاب المطاعم' }, { status: 500 });
  }
}
