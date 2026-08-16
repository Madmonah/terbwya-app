import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// تحديث حالة طيار: موافقة (active) / إيقاف (suspended) / إرجاع للمراجعة (pending)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { status } = await req.json();
    if (!['pending', 'active', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
    }

    const supa = getSupabaseAdminClient();
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    // الإيقاف بيخرجه من "متاح" تلقائيًا
    if (status !== 'active') updates.is_online = false;

    const { error } = await supa.from('riders').update(updates).eq('id', params.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/riders/:id] PATCH error:', e);
    return NextResponse.json({ error: 'حصل خطأ في التحديث' }, { status: 500 });
  }
}
