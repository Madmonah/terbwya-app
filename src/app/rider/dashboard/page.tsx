'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Bike, LogOut, MapPin, Phone, Banknote, PackageCheck, Loader2, Clock, Store, Bell, BellRing,
} from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';
import { pushSupported, subscribeToPush } from '@/lib/pushClient';

type AvailableOrder = {
  id: string;
  reference: string;
  status: string;
  total_egp: number;
  delivery_fee_egp: number;
  city: string | null;
  district: string | null;
  delivery_address: string | null;
  created_at: string;
  restaurant: { name: string; address: string | null; city: string | null; lat: number | null; lng: number | null };
};

type ActiveOrder = AvailableOrder & {
  customer_name: string | null;
  customer_phone: string;
  customer_lat: number | null;
  customer_lng: number | null;
  notes: string | null;
  items: { item_name: string; quantity: number }[];
  restaurant: AvailableOrder['restaurant'] & { owner_phone: string | null };
};

type DashboardData = {
  rider: { id: string; name: string; status: string; is_online: boolean; city: string | null; is_restaurant_rider: boolean };
  active_orders: ActiveOrder[];
  earnings: { today_egp: number; total_egp: number; delivered_count: number };
};

function mapsLink(lat: number | null, lng: number | null, fallback?: string | null) {
  if (lat != null && lng != null) return `https://maps.google.com/?q=${lat},${lng}`;
  if (fallback) return `https://maps.google.com/?q=${encodeURIComponent(fallback)}`;
  return null;
}

export default function RiderDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [available, setAvailable] = useState<AvailableOrder[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  const load = useCallback(async (silent = false) => {
    try {
      const supa = getSupabaseAuthClient();
      const { data: { session } } = await supa.auth.getSession();
      if (!session?.user) {
        router.replace('/rider/login');
        return;
      }

      const { data: dash, error } = await supa.rpc('get_my_rider_dashboard');
      if (error) throw error;
      setData(dash as DashboardData);

      if ((dash as DashboardData).rider.status === 'active') {
        const { data: avail } = await supa.rpc('get_available_orders_for_rider');
        setAvailable((avail as AvailableOrder[]) || []);
      }
    } catch (e: any) {
      if (e?.message === 'not_a_rider') {
        router.replace('/rider/signup');
        return;
      }
      if (!silent) toast.error('حصل خطأ في التحميل');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // تحديث لايف كل 15 ثانية
  useEffect(() => {
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function toggleOnline() {
    if (!data) return;
    try {
      const supa = getSupabaseAuthClient();
      const { error } = await supa.rpc('set_rider_online', { p_online: !data.rider.is_online });
      if (error) throw error;
      setData({ ...data, rider: { ...data.rider, is_online: !data.rider.is_online } });
      toast.success(!data.rider.is_online ? 'أنت متاح دلوقتي 🟢' : 'أنت مش متاح ⚪');
    } catch {
      toast.error('حصل خطأ');
    }
  }

  async function acceptOrder(orderId: string) {
    setWorking(orderId);
    try {
      const supa = getSupabaseAuthClient();
      const { error } = await supa.rpc('rider_accept_order', { p_order_id: orderId });
      if (error) throw error;
      toast.success('الطلب بقى معاك! 🛵');
      load();
    } catch (e: any) {
      toast.error(e?.message === 'order_already_taken' ? 'طيار تاني خد الطلب ده — اقبل غيره' : 'حصل خطأ');
      load(true);
    } finally {
      setWorking(null);
    }
  }

  async function updateStatus(orderId: string, status: 'out_for_delivery' | 'delivered') {
    setWorking(orderId);
    try {
      const supa = getSupabaseAuthClient();
      const { error } = await supa.rpc('rider_update_order_status', { p_order_id: orderId, p_status: status });
      if (error) throw error;
      toast.success(status === 'out_for_delivery' ? 'في أمان الله! 🛵' : 'تسليم موفق! 🎉');
      load();
    } catch {
      toast.error('حصل خطأ');
    } finally {
      setWorking(null);
    }
  }

  async function enablePush() {
    if (!data) return;
    try {
      const sub = await subscribeToPush();
      if (!sub) {
        toast.error('لازم توافق على الإشعارات من المتصفح');
        return;
      }
      const supa = getSupabaseAuthClient();
      const { error } = await supa.from('push_subscriptions').upsert(
        {
          kind: 'rider',
          rider_id: data.rider.id,
          restaurant_id: null,
          order_id: null,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        { onConflict: 'endpoint' }
      );
      if (error) throw error;
      setPushEnabled(true);
      toast.success('هيوصلك إشعار بكل طلب جديد متاح 🔔');
    } catch {
      toast.error('حصل خطأ في تفعيل الإشعارات');
    }
  }

  async function logout() {
    const supa = getSupabaseAuthClient();
    await supa.auth.signOut();
    router.push('/rider/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { rider, active_orders, earnings } = data;

  // حساب لسه قيد المراجعة أو موقوف
  if (rider.status !== 'active') {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md text-center">
          <div className="text-5xl mb-4">{rider.status === 'pending' ? '⏳' : '🚫'}</div>
          <h2 className="text-xl font-black text-brand-ink">
            {rider.status === 'pending' ? 'حسابك قيد المراجعة' : 'حسابك موقوف'}
          </h2>
          <p className="text-sm text-brand-ink/60 mt-2">
            {rider.status === 'pending'
              ? 'أهلاً ' + rider.name + '! بنراجع بياناتك وهنفعّل حسابك في أقرب وقت. ارجع تاني بعد شوية.'
              : 'تواصل مع إدارة ترباوية لمعرفة السبب.'}
          </p>
          <button onClick={logout} className="mt-5 px-5 py-2.5 rounded-xl bg-gray-100 text-brand-ink text-sm font-bold">
            تسجيل خروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream" dir="rtl">
      <header className="bg-brand-red text-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-black truncate">{rider.name}</p>
              <p className="text-[11px] text-white/75">{rider.city || 'كل المدن'} · طيار {rider.is_restaurant_rider ? 'مطعم' : 'ترباوية'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleOnline}
              className={`px-3.5 py-2 rounded-full text-xs font-black transition-colors ${
                rider.is_online ? 'bg-green-500 text-white' : 'bg-white/15 text-white/80'
              }`}
            >
              {rider.is_online ? '🟢 متاح' : '⚪ مش متاح'}
            </button>
            <button onClick={logout} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5 pb-16">
        {/* الأرباح */}
        <section className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-2xl border border-gray-100 p-3.5 text-center">
            <p className="text-[10px] font-bold text-brand-ink/50 mb-0.5">أرباح النهارده</p>
            <p className="text-lg font-black text-green-600">{Number(earnings.today_egp).toLocaleString('ar-EG')} ج</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-3.5 text-center">
            <p className="text-[10px] font-bold text-brand-ink/50 mb-0.5">إجمالي الأرباح</p>
            <p className="text-lg font-black text-brand-ink">{Number(earnings.total_egp).toLocaleString('ar-EG')} ج</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-3.5 text-center">
            <p className="text-[10px] font-bold text-brand-ink/50 mb-0.5">طلبات وصّلتها</p>
            <p className="text-lg font-black text-brand-ink">{earnings.delivered_count.toLocaleString('ar-EG')}</p>
          </div>
        </section>

        {/* تفعيل الإشعارات */}
        {pushSupported() && !pushEnabled && (
          <button
            onClick={enablePush}
            className="w-full flex items-center justify-center gap-2 bg-brand-orange text-white font-bold py-2.5 rounded-xl text-sm"
          >
            <Bell className="w-4 h-4" /> فعّل إشعارات الطلبات الجديدة
          </button>
        )}
        {pushEnabled && (
          <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl py-2 px-4 text-sm font-bold">
            <BellRing className="w-4 h-4" /> الإشعارات شغالة
          </div>
        )}

        {/* الطلب الحالي */}
        {active_orders.length > 0 && (
          <section>
            <h2 className="font-black text-brand-ink mb-2.5 flex items-center gap-1.5">
              <PackageCheck className="w-5 h-5 text-brand-red" /> طلباتك الحالية
            </h2>
            <div className="space-y-3">
              {active_orders.map((o) => {
                const restLink = mapsLink(o.restaurant.lat, o.restaurant.lng, o.restaurant.address);
                const custLink = mapsLink(o.customer_lat, o.customer_lng, o.delivery_address);
                return (
                  <div key={o.id} className="bg-white rounded-2xl border-2 border-brand-red/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-brand-ink">طلب #{o.reference}</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 text-brand-red">
                        {o.status === 'out_for_delivery' ? '🛵 في الطريق' : '👨‍🍳 بيتحضّر'}
                      </span>
                    </div>

                    {/* المطعم */}
                    <div className="bg-brand-cream rounded-xl p-3">
                      <p className="text-[10px] font-bold text-brand-ink/50 mb-1 flex items-center gap-1">
                        <Store className="w-3 h-3" /> الاستلام من
                      </p>
                      <p className="font-bold text-sm text-brand-ink">{o.restaurant.name}</p>
                      <p className="text-xs text-brand-ink/60 mt-0.5">{o.restaurant.address || o.restaurant.city}</p>
                      <div className="flex gap-2 mt-2">
                        {restLink && (
                          <a href={restLink} target="_blank" rel="noreferrer" className="flex-1 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg py-1.5 no-underline text-brand-ink">
                            📍 الخريطة
                          </a>
                        )}
                        {o.restaurant.owner_phone && (
                          <a href={`tel:${o.restaurant.owner_phone}`} className="flex-1 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg py-1.5 no-underline text-brand-ink">
                            📞 اتصل بالمطعم
                          </a>
                        )}
                      </div>
                    </div>

                    {/* العميل */}
                    <div className="bg-brand-cream rounded-xl p-3">
                      <p className="text-[10px] font-bold text-brand-ink/50 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> التسليم لـ
                      </p>
                      <p className="font-bold text-sm text-brand-ink">{o.customer_name || 'عميل'}</p>
                      <p className="text-xs text-brand-ink/60 mt-0.5">
                        {o.delivery_address} {o.district ? `— ${o.district}` : ''} {o.city ? `— ${o.city}` : ''}
                      </p>
                      {o.notes && <p className="text-xs text-brand-orange font-bold mt-1">📝 {o.notes}</p>}
                      <div className="flex gap-2 mt-2">
                        {custLink && (
                          <a href={custLink} target="_blank" rel="noreferrer" className="flex-1 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg py-1.5 no-underline text-brand-ink">
                            📍 الخريطة
                          </a>
                        )}
                        <a href={`tel:${o.customer_phone}`} className="flex-1 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg py-1.5 no-underline text-brand-ink">
                          📞 اتصل بالعميل
                        </a>
                      </div>
                    </div>

                    {/* الأصناف والفلوس */}
                    <div className="text-xs text-brand-ink/70 space-y-0.5">
                      {o.items.map((it, i) => (
                        <div key={i}>{it.item_name} × {it.quantity}</div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                        <Banknote className="w-4 h-4" /> اقبض من العميل (كاش)
                      </span>
                      <span className="font-black text-amber-800">{Number(o.total_egp).toLocaleString('ar-EG')} ج</span>
                    </div>
                    <p className="text-[11px] text-brand-ink/50 text-center">
                      أرباحك من الطلب ده: <span className="font-bold text-green-600">{Number(o.delivery_fee_egp).toLocaleString('ar-EG')} ج</span> (رسوم التوصيل)
                    </p>

                    {o.status !== 'out_for_delivery' ? (
                      <button
                        onClick={() => updateStatus(o.id, 'out_for_delivery')}
                        disabled={working === o.id}
                        className="w-full bg-brand-red text-white font-black py-3 rounded-xl disabled:opacity-50"
                      >
                        استلمت الطلب من المطعم 🛵
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(o.id, 'delivered')}
                        disabled={working === o.id}
                        className="w-full bg-green-600 text-white font-black py-3 rounded-xl disabled:opacity-50"
                      >
                        تم التسليم للعميل ✅
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* الطلبات المتاحة */}
        <section>
          <h2 className="font-black text-brand-ink mb-2.5 flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-brand-red" /> طلبات متاحة {rider.city ? `في ${rider.city}` : ''}
          </h2>

          {!rider.is_online && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-center text-sm font-bold mb-3">
              حط نفسك "متاح" من فوق عشان تستقبل إشعارات الطلبات الجديدة
            </div>
          )}

          {available.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center text-brand-ink/50 text-sm">
              مفيش طلبات متاحة دلوقتي — أول ما مطعم يأكد طلب هيظهر هنا فورًا
            </div>
          ) : (
            <div className="space-y-2.5">
              {available.map((o) => (
                <div key={o.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-brand-ink text-sm">{o.restaurant.name}</span>
                    <span className="text-xs text-brand-ink/40">
                      {new Date(o.created_at).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-brand-ink/60 mb-2">
                    التوصيل لـ: {o.district || ''} {o.city ? `— ${o.city}` : o.delivery_address || ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-brand-ink/50">قيمة الطلب: </span>
                      <span className="font-bold">{Number(o.total_egp).toLocaleString('ar-EG')} ج</span>
                      <span className="text-green-600 font-black mr-2">+ {Number(o.delivery_fee_egp).toLocaleString('ar-EG')} ج ليك</span>
                    </div>
                    <button
                      onClick={() => acceptOrder(o.id)}
                      disabled={working === o.id}
                      className="bg-brand-red text-white font-black text-sm px-5 py-2 rounded-xl disabled:opacity-50"
                    >
                      {working === o.id ? '...' : 'اقبل الطلب'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
