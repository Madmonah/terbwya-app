'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Loader2, LogOut, Package, ShoppingBag, Settings, BarChart3, Bike, Star, Tag,
} from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';
import MenuTab from './MenuTab';
import SettingsTab from './SettingsTab';
import AnalyticsTab from './AnalyticsTab';
import RidersTab from './RidersTab';
import ReviewsTab from './ReviewsTab';
import OffersTab from './OffersTab';
import EnableNotifications from './EnableNotifications';

type Tab = 'orders' | 'menu' | 'offers' | 'riders' | 'reviews' | 'analytics' | 'settings';

// صوت تنبيه "طلب جديد" — Web Audio مباشرة من غير ملف صوت
function playNewOrderSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    [880, 1174, 880, 1174].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  } catch {
    // المتصفح ممكن يمنع الصوت قبل أي تفاعل — مش مشكلة
  }
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'بيتحضّر',
  out_for_delivery: 'في الطريق',
  delivered: 'اتسلّم',
  cancelled: 'ملغي',
};

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

export default function OwnerDashboardPage({ params }: { params: { id: string } }) {
  const restaurantId = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('orders');
  const knownOrderIdsRef = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supa = getSupabaseAuthClient();
      const { data: { session } } = await supa.auth.getSession();
      if (!session?.user) {
        router.replace('/owner/login');
        return;
      }

      const { data: rest, error: restError } = await supa
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle();

      if (restError || !rest) {
        setDenied(true);
        setLoading(false);
        return;
      }
      setRestaurant(rest);

      const { data: ordersData } = await supa
        .from('orders')
        .select('*, order_items(*), rider:riders(name, phone)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(100);
      setOrders(ordersData || []);
      knownOrderIdsRef.current = new Set((ordersData || []).map((o: any) => o.id));

      const { data: menuData } = await supa
        .from('menu_items')
        .select('*, sizes:menu_item_sizes(*)')
        .eq('restaurant_id', restaurantId)
        .order('display_order');
      setMenuItems(menuData || []);
    } catch (e) {
      console.error('[owner/dashboard] load error:', e);
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, router]);

  useEffect(() => {
    load();
  }, [load]);

  // مراقبة لايف: كل 20 ثانية نشيك على طلبات جديدة — صوت تنبيه + توست + تغيير عنوان التاب
  useEffect(() => {
    if (denied) return;
    const interval = setInterval(async () => {
      try {
        const supa = getSupabaseAuthClient();
        const { data: fresh } = await supa
          .from('orders')
          .select('*, order_items(*), rider:riders(name, phone)')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(100);
        if (!fresh) return;

        const known = knownOrderIdsRef.current;
        if (known) {
          const newOnes = fresh.filter((o: any) => !known.has(o.id));
          if (newOnes.length > 0) {
            playNewOrderSound();
            toast.success(
              newOnes.length === 1
                ? `🔔 طلب جديد #${newOnes[0].reference}!`
                : `🔔 ${newOnes.length} طلبات جديدة!`,
              { duration: 8000 }
            );
            document.title = `(${newOnes.length}) 🔔 طلب جديد — ترباوية`;
            setTimeout(() => {
              document.title = 'داشبورد المطعم — ترباوية';
            }, 15000);
          }
        }
        knownOrderIdsRef.current = new Set(fresh.map((o: any) => o.id));
        setOrders(fresh);
      } catch {
        // خطأ شبكة مؤقت — نحاول في الدورة الجاية
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [restaurantId, denied]);

  async function logout() {
    const supa = getSupabaseAuthClient();
    await supa.auth.signOut();
    router.push('/owner/login');
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      const supa = getSupabaseAuthClient();
      const { error } = await supa.rpc('update_order_status', { p_order_id: orderId, p_status: status });
      if (error) throw error;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      toast.success('اتحدثت حالة الطلب');
    } catch (e) {
      console.error('[owner/dashboard] status update error:', e);
      toast.error('حصل خطأ في تحديث الحالة');
    }
  }

  async function toggleAvailability(itemId: string, current: boolean) {
    try {
      const supa = getSupabaseAuthClient();
      const { error } = await supa.from('menu_items').update({ is_available: !current }).eq('id', itemId);
      if (error) throw error;
      setMenuItems((prev) => prev.map((m) => (m.id === itemId ? { ...m, is_available: !current } : m)));
    } catch (e) {
      toast.error('حصل خطأ');
    }
  }

  async function deleteMenuItem(itemId: string) {
    try {
      const supa = getSupabaseAuthClient();
      const { error } = await supa.from('menu_items').delete().eq('id', itemId);
      if (error) throw error;
      setMenuItems((prev) => prev.filter((m) => m.id !== itemId));
      toast.success('اتحذف الصنف');
    } catch (e) {
      toast.error('حصل خطأ في الحذف');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  if (denied || !restaurant) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md text-center">
          <h2 className="text-xl font-black text-brand-ink">مالكش صلاحية</h2>
          <p className="text-sm text-brand-ink/60 mt-2">المطعم ده مش مربوط بحسابك.</p>
          <Link href="/owner/login" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-bold no-underline">
            رجوع لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total_egp || 0), 0);

  return (
    <div className="min-h-screen bg-brand-cream" dir="rtl">
      <header className="bg-brand-red text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/70 mb-1">داشبورد المطاعم · ترباوية</p>
            <h1 className="text-xl md:text-2xl font-black">{restaurant.name}</h1>
            <p className="text-xs text-white/80 mt-1">
              الحالة: {restaurant.status === 'published' ? '✅ منشور' : restaurant.status}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <EnableNotifications restaurantId={restaurantId} />
            <button onClick={logout} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center gap-2">
              <LogOut className="w-4 h-4" /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* مسودة مهجورة (سجّل ومكملش المعالج)؟ زر نشر مباشر */}
        {restaurant.status !== 'published' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-bold text-amber-800">
              ⚠️ مطعمك لسه مش منشور — العملاء مش شايفينه. كمّل بياناتك ومنيوك وانشره.
            </p>
            <button
              onClick={async () => {
                try {
                  const supa = getSupabaseAuthClient();
                  const { error } = await supa.rpc('publish_own_restaurant', { p_restaurant_id: restaurantId });
                  if (error) throw error;
                  toast.success('اتنشر مطعمك! 🎉');
                  load();
                } catch {
                  toast.error('حصل خطأ في النشر');
                }
              }}
              className="bg-brand-red text-white font-bold text-sm px-4 py-2 rounded-xl shrink-0"
            >
              انشر مطعمك دلوقتي 🚀
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="إجمالي الطلبات" value={orders.length} />
          <StatCard label="طلبات قيد الانتظار" value={pendingCount} highlight={pendingCount > 0} />
          <StatCard label="أصناف المنيو" value={menuItems.length} />
          <StatCard label="إيراد الطلبات المسلّمة" value={`${totalRevenue.toLocaleString()} ج`} />
        </section>

        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 md:mx-0 md:px-0">
          <TabButton active={tab === 'orders'} onClick={() => setTab('orders')} icon={<ShoppingBag size={16} />} label="الطلبات" />
          <TabButton active={tab === 'menu'} onClick={() => setTab('menu')} icon={<Package size={16} />} label="المنيو" />
          <TabButton active={tab === 'offers'} onClick={() => setTab('offers')} icon={<Tag size={16} />} label="العروض" />
          <TabButton active={tab === 'riders'} onClick={() => setTab('riders')} icon={<Bike size={16} />} label="الطيارين" />
          <TabButton active={tab === 'reviews'} onClick={() => setTab('reviews')} icon={<Star size={16} />} label="التقييمات" />
          <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')} icon={<BarChart3 size={16} />} label="التحليلات" />
          <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={<Settings size={16} />} label="الإعدادات" />
        </div>

        {tab === 'orders' && (
          <OrdersTab orders={orders} onUpdateStatus={updateOrderStatus} />
        )}

        {tab === 'menu' && (
          <MenuTab
            restaurantId={restaurantId}
            menuItems={menuItems}
            onToggle={toggleAvailability}
            onDelete={deleteMenuItem}
            onReload={load}
          />
        )}

        {tab === 'offers' && <OffersTab restaurantId={restaurantId} />}

        {tab === 'riders' && <RidersTab restaurantId={restaurantId} />}

        {tab === 'reviews' && <ReviewsTab restaurantId={restaurantId} />}

        {tab === 'analytics' && <AnalyticsTab restaurantId={restaurantId} />}

        {tab === 'settings' && (
          <SettingsTab
            restaurantId={restaurantId}
            restaurant={restaurant}
            onReload={load}
          />
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${highlight ? 'bg-brand-orange text-white border-transparent' : 'bg-white border-gray-100'}`}>
      <p className={`text-[10px] font-bold tracking-wider uppercase mb-1 ${highlight ? 'text-white/90' : 'text-brand-ink/50'}`}>{label}</p>
      <p className={`text-xl md:text-2xl font-black ${highlight ? 'text-white' : 'text-brand-ink'}`}>{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 font-bold text-sm border-b-2 transition-colors whitespace-nowrap shrink-0 ${
        active ? 'border-brand-red text-brand-red' : 'border-transparent text-brand-ink/50 hover:text-brand-ink'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function OrdersTab({ orders, onUpdateStatus }: { orders: any[]; onUpdateStatus: (id: string, status: string) => void }) {
  if (orders.length === 0) {
    return <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-brand-ink/50">لسه مفيش طلبات</div>;
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div>
              <span className="font-bold text-brand-ink">طلب #{o.reference}</span>
              <span className="text-xs text-brand-ink/50 mr-2">{new Date(o.created_at).toLocaleString('ar-EG')}</span>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              o.status === 'delivered' ? 'bg-green-100 text-green-700' :
              o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-brand-amber/20 text-brand-orange'
            }`}>
              {ORDER_STATUS_LABELS[o.status] || o.status}
            </span>
          </div>
          <div className="text-sm text-brand-ink/70 mb-2">
            {o.customer_name || 'عميل'} · {o.customer_phone} · {o.delivery_address}
          </div>
          {o.rider && (
            <div className="text-xs font-bold text-brand-red mb-2">
              🛵 الطيار: {o.rider.name} · <span dir="ltr">{o.rider.phone}</span>
            </div>
          )}
          {o.notes && (
            <div className="text-xs text-brand-orange font-bold mb-2">📝 {o.notes}</div>
          )}
          <div className="text-sm mb-3 space-y-0.5">
            {(o.order_items || []).map((it: any) => (
              <div key={it.id} className="flex justify-between text-brand-ink/80">
                <span>{it.item_name} × {it.quantity}</span>
                <span>{it.line_total} ج</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="font-bold text-brand-red">الإجمالي: {o.total_egp} ج</span>
            {o.status !== 'delivered' && o.status !== 'cancelled' && (
              <div className="flex gap-2">
                {STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1] && (
                  <button
                    onClick={() => onUpdateStatus(o.id, STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1])}
                    className="text-xs font-bold bg-brand-red text-white px-3 py-1.5 rounded-lg"
                  >
                    التالي: {ORDER_STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1]]}
                  </button>
                )}
                <button
                  onClick={() => onUpdateStatus(o.id, 'cancelled')}
                  className="text-xs font-bold text-red-500 px-3 py-1.5 rounded-lg border border-red-200"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

