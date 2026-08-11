import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminCredentials,
  buildSessionCookieValue,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
    }

    if (!verifyAdminCredentials(email, password)) {
      return NextResponse.json({ error: 'الإيميل أو كلمة السر غلط' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, buildSessionCookieValue(), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
    return res;
  } catch (e) {
    console.error('[admin/login] error:', e);
    return NextResponse.json({ error: 'حصل خطأ، حاول تاني' }, { status: 500 });
  }
}
