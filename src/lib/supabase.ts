import { createClient, SupabaseClient } from '@supabase/supabase-js';

// عميل Supabase الخاص بمشروع ترباوية (قاعدة بيانات مستقلة تمامًا عن مضمونة)
// نسخة بدون تخزين جلسة — للقراءة العامة فقط (صفحات المطاعم والمنيو)
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}

// نسخة بتخزين الجلسة — الجلسة بتفضل محفوظة في المتصفح لحد ما المستخدم يعمل خروج بنفسه.
// كل دور ليه جلسة منفصلة (عميل / صاحب مطعم / طيار) عشان تسجيل دخول دور
// ميطلعش الدور التاني على نفس الجهاز.
export type AuthRole = 'customer' | 'owner' | 'rider';

const AUTH_STORAGE_KEYS: Record<AuthRole, string> = {
  customer: 'terbwya-customer-auth',
  owner: 'terbwya-owner-auth', // نفس المفتاح القديم — جلسات أصحاب المطاعم الحالية بتفضل شغالة
  rider: 'terbwya-rider-auth',
};

const authedClients: Partial<Record<AuthRole, SupabaseClient>> = {};

export function getSupabaseAuthClient(role: AuthRole = 'customer') {
  const cached = authedClients[role];
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  const client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: AUTH_STORAGE_KEYS[role] },
  });
  authedClients[role] = client;
  return client;
}

// عميل السيرفر فقط بصلاحية service_role — بيتخطى RLS بالكامل.
// لازم يتستخدم فقط جوه API routes على السيرفر، أبدًا في كود بيوصل للمتصفح.
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}
