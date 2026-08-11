import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';

/** بيتحقق من جلسة الأدمن جوه Route Handler، ولو مش مسجل بيرجع 401 جاهز للإرجاع */
export async function requireAdmin(): Promise<NextResponse | null> {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }
  return null;
}
