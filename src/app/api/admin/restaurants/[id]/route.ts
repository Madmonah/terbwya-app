import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/adminGuard';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = ['draft', 'pending_review', 'published', 'suspended'];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (typeof body.status === 'string') {
      if (!ALLOWED_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
      }
      update.status = body.status;
    }
    if (typeof body.featured === 'boolean') {
      update.featured = body.featured;
    }
    if (typeof body.is_open === 'boolean') {
      update.is_open = body.is_open;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'مفيش حاجة للتحديث' }, { status: 400 });
    }

    const supa = getSupabaseAdminClient();
    const { data, error } = await supa
      .from('restaurants')
      .update(update)
      .eq('id', params.id)
      .select('id,status,featured,is_open')
      .single();

    if (error) throw error;
    return NextResponse.json({ restaurant: data });
  } catch (e) {
    console.error('[api/admin/restaurants/:id] error:', e);
    return NextResponse.json({ error: 'تعذّر تحديث المطعم' }, { status: 500 });
  }
}
