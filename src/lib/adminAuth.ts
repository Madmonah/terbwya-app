import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'terbwya_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // أسبوع

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('Missing ADMIN_SESSION_SECRET env var');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/** بيتحقق من إيميل/باسورد الأدمن الثابتين، وبيرجع true/false */
export function verifyAdminCredentials(email: string, password: string): boolean {
  const validEmail = process.env.ADMIN_EMAIL;
  const validPassword = process.env.ADMIN_PASSWORD;
  if (!validEmail || !validPassword) return false;

  const emailOk = email.trim().toLowerCase() === validEmail.trim().toLowerCase();
  const passwordBuf = Buffer.from(password);
  const validBuf = Buffer.from(validPassword);
  const passwordOk =
    passwordBuf.length === validBuf.length && timingSafeEqual(passwordBuf, validBuf);

  return emailOk && passwordOk;
}

/** بيبني قيمة كوكي الجلسة الموقّعة (expiry + توقيع HMAC) */
export function buildSessionCookieValue(): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `admin:${expiresAt}`;
  const signature = sign(payload);
  return `${payload}:${signature}`;
}

function isValidSessionValue(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  const [role, expiresAtStr, signature] = parts;
  if (role !== 'admin') return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expectedSignature = sign(`${role}:${expiresAtStr}`);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(sigBuf, expectedBuf);
}

export const ADMIN_SESSION_COOKIE = COOKIE_NAME;
export const ADMIN_SESSION_MAX_AGE = SESSION_TTL_SECONDS;

/** بيتأكد (من جوه Server Component أو Route Handler) إن الأدمن مسجل دخول */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;
  return isValidSessionValue(value);
}
