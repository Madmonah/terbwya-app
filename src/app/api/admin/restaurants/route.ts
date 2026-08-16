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
      .from('restaurants')
      .select(
        'id,slug,name,city,district,status,is_open,featured,rating,reviews_count,commission_percent,created_at,offers:restaurant_offers(id,discount_percent,starts_at,ends_at),owner:restaurant_owners(id,business_name,phone,email),cuisine_category:cuisine_categories(name_ar)'
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ restaurants: data || [] });
  } catch (e) {
    console.error('[api/admin/restaurants] error:', e);
    return NextResponse.json({ error: 'تعذّر تحميل المطاعم' }, { status: 500 });
  }
}
