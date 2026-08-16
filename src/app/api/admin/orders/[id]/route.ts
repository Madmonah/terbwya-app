import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// إجراءات الأدمن على طلب: شيل تعيين الطيار (يرجع الطلب متاح) أو غيّر الحالة
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { action, status } = await req.json();
    const supa = getSupabaseAdminClient();

    if (action === 'unassign_rider') {
      const { data: order } = await supa
        .from('orders')
        .select('id, status, rider_id')
        .eq('id', params.id)
        .maybeSingle();

      if (!order) {
        return NextResponse.json({ error: 'الطلب مش موجود' }, { status: 404 });
      }
      if (!order.rider_id) {
        return NextResponse.json({ error: 'مفيش طيار متعيّن أصلاً' }, { status: 400 });
      }

      const { error } = await supa
        .from('orders')
        .update({ rider_id: null, updated_at: new Date().toISOString() })
        .eq('id', params.id);
      if (error) throw error;

      return NextResponse.json({ ok: true });
    }

    if (action === 'set_status') {
      if (!['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) {
        return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
      }
      const { error } = await supa
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', params.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (e) {
    console.error('[admin/orders/:id] PATCH error:', e);
    return NextResponse.json({ error: 'حصل خطأ' }, { status: 500 });
  }
}
