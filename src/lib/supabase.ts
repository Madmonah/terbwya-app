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

// نسخة بتخزين الجلسة — لتسجيل دخول/تسجيل أصحاب المطاعم والداشبورد
let authedClient: SupabaseClient | null = null;
export function getSupabaseAuthClient() {
  if (authedClient) return authedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  authedClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'terbwya-owner-auth' },
  });
  return authedClient;
}
