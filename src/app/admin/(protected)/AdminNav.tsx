'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Store, ClipboardList, Users, UserCircle, LogOut, Bell, Bike, Banknote } from 'lucide-react';

const LINKS = [
  { href: '/admin', label: 'الإحصائيات', icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'المطاعم', icon: Store },
  { href: '/admin/orders', label: 'الطلبات', icon: ClipboardList },
  { href: '/admin/riders', label: 'الطيارين', icon: Bike },
  { href: '/admin/settlements', label: 'الحسابات', icon: Banknote },
  { href: '/admin/owners', label: 'أصحاب المطاعم', icon: UserCircle },
  { href: '/admin/customers', label: 'العملاء', icon: Users },
  { href: '/admin/notifications', label: 'الإشعارات', icon: Bell },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <aside className="w-16 md:w-56 shrink-0 bg-violet-900 text-white min-h-screen flex flex-col">
      <div className="px-3 md:px-5 py-5 border-b border-white/10">
        <span className="hidden md:block font-extrabold text-lg">لوحة تحكم ترباوية</span>
        <span className="md:hidden text-xl">🛠️</span>
      </div>
      <nav className="flex-1 py-3">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 md:px-5 py-3 text-sm font-semibold no-underline transition-colors ${
                active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 md:px-5 py-4 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white border-t border-white/10"
      >
        <LogOut className="w-5 h-5 shrink-0" />
        <span className="hidden md:inline">تسجيل خروج</span>
      </button>
    </aside>
  );
}
