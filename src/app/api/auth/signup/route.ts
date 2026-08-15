import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// تسجيل حساب جديد (صاحب مطعم أو عميل) سيرفر-سايد بحساب مُأكّد فورًا —
// مفيش إيميل تأكيد خالص، وتجربة التسجيل بتكمل في نفس اللحظة.
// كمان بيصلّح الحسابات "الناقصة" (اتعملت في Auth بس من غير صف البيانات):
// لو الإيميل موجود وكلمة السر صح، بنكمّل الصف الناقص وبنرجع نجاح عادي.
export async function POST(req: NextRequest) {
  try {
    const { role, businessName, name, phone, email, password } = await req.json();

    // ---- التحقق من المدخلات ----
    if (!['owner', 'customer'].includes(role)) {
      return NextResponse.json({ error: 'bad_role' }, { status: 400 });
    }
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const displayName = role === 'owner' ? String(businessName || '').trim() : String(name || '').trim();

    if (!displayName) {
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

    const admin = getSupabaseAdminClient();

    // ---- محاولة إنشاء المستخدم (مُأكّد فورًا — مفيش إيميل تأكيد) ----
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: String(password),
      email_confirm: true,
    });

    let userId: string;

    if (createError) {
      const msg = (createError.message || '').toLowerCase();
      const isDuplicate =
        msg.includes('already') || (createError as any).code === 'email_exists' || createError.status === 422;
      if (!isDuplicate) throw createError;

      // الإيميل موجود قبل كده — نتحقق من كلمة السر قبل أي حاجة
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const anon = createClient(url, anonKey, { auth: { persistSession: false } });
      const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({
        email: cleanEmail,
        password: String(password),
      });
      if (signInError || !signIn.user) {
        // كلمة السر غلط أو الحساب موجود لحد تاني — يسجّل دخول عادي
        return NextResponse.json({ error: 'email_exists' }, { status: 409 });
      }
      userId = signIn.user.id;
    } else {
      userId = created.user!.id;
    }

    // ---- إنشاء/إكمال صف البيانات ----
    if (role === 'owner') {
      const { data: existing } = await admin
        .from('restaurant_owners')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ ok: true, ownerId: existing.id, repaired: true });
      }

      const { data: owner, error: ownerError } = await admin
        .from('restaurant_owners')
        .insert({
          auth_user_id: userId,
          business_name: displayName,
          phone: cleanPhone,
          whatsapp_number: cleanPhone,
          email: cleanEmail,
        })
        .select('id')
        .single();

      if (ownerError) {
        // لو الصف فشل والمستخدم لسه متعمل دلوقتي — نظّف عشان ميبقاش حساب ناقص
        if (!createError) await admin.auth.admin.deleteUser(userId).catch(() => {});
        throw ownerError;
      }
      return NextResponse.json({ ok: true, ownerId: owner.id });
    }

    // role === 'customer'
    const { data: existingCustomer } = await admin
      .from('customers')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (!existingCustomer) {
      const { error: customerError } = await admin.from('customers').insert({
        auth_user_id: userId,
        name: displayName,
        phone: cleanPhone,
        whatsapp_number: cleanPhone,
        email: cleanEmail,
      });
      if (customerError) {
        if (!createError) await admin.auth.admin.deleteUser(userId).catch(() => {});
        throw customerError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[auth/signup] error:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
