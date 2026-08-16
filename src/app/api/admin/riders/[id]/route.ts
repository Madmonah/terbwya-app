import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// تحديث طيار: الحالة (موافقة/إيقاف/مراجعة) و/أو عمولة المنصة لكل طلب
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status !== undefined) {
      if (!['pending', 'active', 'suspended'].includes(body.status)) {
        return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
      }
      updates.status = body.status;
      // الإيقاف بيخرجه من "متاح" تلقائيًا
      if (body.status !== 'active') updates.is_online = false;
    }

    // عمولة المنصة لكل طلب — الإدارة بس (service role)، بتتطبق على التسليمات الجاية
    if (body.commission_per_order_egp !== undefined) {
      const commission = Number(body.commission_per_order_egp);
      if (!Number.isFinite(commission) || commission < 0 || commission > 500) {
        return NextResponse.json({ error: 'العمولة لازم تكون رقم من 0 لـ 500 جنيه' }, { status: 400 });
      }
      updates.commission_per_order_egp = commission;
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'مفيش حاجة تتحدّث' }, { status: 400 });
    }

    const supa = getSupabaseAdminClient();
    const { error } = await supa.from('riders').update(updates).eq('id', params.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/riders/:id] PATCH error:', e);
    return NextResponse.json({ error: 'حصل خطأ في التحديث' }, { status: 500 });
  }
}
