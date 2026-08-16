import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// صاحب المطعم يضيف طيار خاص بمطعمه — بيتعمل حساب مُأكّد ونشط فورًا
// (طيارين المطعم مش محتاجين موافقة الأدمن لأن المطعم مسؤول عنهم)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { restaurantId, name, phone, email, password } = await req.json();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').replace(/\D/g, '');

    if (!restaurantId || !String(name || '').trim()) {
      return NextResponse.json({ error: 'name_required' }, { status: 400 });
    }
    if (!/^01[0-9]{9}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (!password || String(password).length < 6) {
      return NextResponse.json({ error: 'weak_password' }, { status: 400 });
    }

    // التحقق من هوية صاحب المطعم من التوكن بتاعه
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await anon.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // التأكد إن المطعم ده فعلاً بتاع المستخدم ده
    const { data: restaurant } = await admin
      .from('restaurants')
      .select('id, city, owner:restaurant_owners!inner(auth_user_id)')
      .eq('id', restaurantId)
      .maybeSingle();

    if (!restaurant || (restaurant.owner as any)?.auth_user_id !== userData.user.id) {
      return NextResponse.json({ error: 'not_your_restaurant' }, { status: 403 });
    }

    // إنشاء حساب الطيار مُأكّد فورًا
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: String(password),
      email_confirm: true,
    });

    if (createError) {
      const msg = (createError.message || '').toLowerCase();
      if (msg.includes('already') || createError.status === 422) {
        return NextResponse.json({ error: 'email_exists' }, { status: 409 });
      }
      throw createError;
    }

    const { data: rider, error: riderError } = await admin
      .from('riders')
      .insert({
        auth_user_id: created.user!.id,
        restaurant_id: restaurantId,
        name: String(name).trim(),
        phone: cleanPhone,
        email: cleanEmail,
        city: restaurant.city,
        status: 'active', // طيار المطعم بيبقى نشط فورًا
      })
      .select('id')
      .single();

    if (riderError) {
      await admin.auth.admin.deleteUser(created.user!.id).catch(() => {});
      throw riderError;
    }

    return NextResponse.json({ ok: true, riderId: rider.id });
  } catch (e) {
    console.error('[owner/riders] POST error:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
