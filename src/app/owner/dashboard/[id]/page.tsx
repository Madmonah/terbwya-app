'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Loader2, LogOut, Package, ShoppingBag, Settings,
} from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';
import MenuTab from './MenuTab';
import SettingsTab from './SettingsTab';

type Tab = 'orders' | 'menu' | 'settings';

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
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(100);
      setOrders(ordersData || []);

      const { data: menuData } = await supa
        .from('menu_items')
        .select('*')
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
          <button onClick={logout} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center gap-2">
            <LogOut className="w-4 h-4" /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="إجمالي الطلبات" value={orders.length} />
          <StatCard label="طلبات قيد الانتظار" value={pendingCount} highlight={pendingCount > 0} />
          <StatCard label="أصناف المنيو" value={menuItems.length} />
          <StatCard label="إيراد الطلبات المسلّمة" value={`${totalRevenue.toLocaleString()} ج`} />
        </section>

        <div className="flex gap-2 border-b border-gray-200">
          <TabButton active={tab === 'orders'} onClick={() => setTab('orders')} icon={<ShoppingBag size={16} />} label="الطلبات" />
          <TabButton active={tab === 'menu'} onClick={() => setTab('menu')} icon={<Package size={16} />} label="المنيو" />
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
      className={`flex items-center gap-1.5 px-4 py-2.5 font-bold text-sm border-b-2 transition-colors ${
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

