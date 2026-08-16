'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Menu as MenuIcon, User, Heart, ListOrdered, LogIn, X } from 'lucide-react';
import { getCart } from '@/lib/cart';
import { getSupabaseAuthClient } from '@/lib/supabase';

const VERTICALS = [
  { href: '/', label: 'المطاعم', icon: '🍽️' },
  { href: '/pharmacies', label: 'الصيدليات', icon: '💊' },
  { href: '/supermarket', label: 'سوبر ماركت', icon: '🛒' },
  { href: '/app', label: 'حمّل الأبليكيشن', icon: '📲' },
];

const APP_TAB = VERTICALS[VERTICALS.length - 1];
const SECTION_TABS = VERTICALS.slice(0, -1);

export default function Header() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const cart = getCart();
      setCartCount(cart.reduce((n, i) => n + i.quantity, 0));
    };
    update();
    window.addEventListener('terbwya-cart-updated', update);
    return () => window.removeEventListener('terbwya-cart-updated', update);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const supa = getSupabaseAuthClient();
        const { data: { session } } = await supa.auth.getSession();
        setIsLoggedIn(!!session?.user);
      } catch {
        // مفيش
      }
    })();
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-brand-red text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
          <span
            className={`relative w-16 h-16 rounded-full bg-white/95 p-0.5 overflow-hidden shrink-0 ${
              pathname === '/' ? 'animate-logo-pulse' : ''
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-icon.png"
              alt="ترباوية"
              className="w-full h-full rounded-full object-cover scale-[1.55]"
            />
          </span>
          <span className="text-xl font-extrabold text-white">ترباوية</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          <Link href="/restaurants" className="text-white/90 hover:text-white no-underline">المطاعم</Link>
          <Link
            href="/offers"
            className="flex items-center gap-1 text-brand-amber hover:text-white no-underline"
          >
            🔥 الدلع مستنيك
          </Link>
          <Link
            href="/app"
            className="flex items-center gap-1 text-brand-amber hover:text-white no-underline"
          >
            📲 حمّل الأبليكيشن
          </Link>
          <Link href="/about" className="text-white/90 hover:text-white no-underline">عن ترباوية</Link>
          <Link href="/join" className="text-white/90 hover:text-white no-underline">انضم كمطعم</Link>
          <Link href="/rider/signup" className="text-white/90 hover:text-white no-underline">انضم كطيار 🛵</Link>
          <Link href="/owner/login" className="text-white/90 hover:text-white no-underline">دخول أصحاب المطاعم</Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <div className="relative hidden sm:block" ref={accountRef}>
            <button
              onClick={() => setAccountOpen((v) => !v)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl font-bold text-sm transition-colors"
              aria-label="حسابي"
            >
              <User size={18} />
              <span className="hidden sm:inline">حسابي</span>
            </button>
            {accountOpen && (
              <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 text-brand-ink z-50">
                <Link
                  href="/favorites"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-brand-cream no-underline text-brand-ink"
                >
                  <Heart size={16} className="text-brand-red" />
                  المفضلة
                </Link>
                <Link
                  href="/account/orders"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-brand-cream no-underline text-brand-ink"
                >
                  <ListOrdered size={16} className="text-brand-red" />
                  طلباتي
                </Link>
                {!isLoggedIn && (
                  <Link
                    href="/account/login"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-brand-cream no-underline text-brand-ink border-t border-gray-100 mt-1 pt-2.5"
                  >
                    <LogIn size={16} className="text-brand-red" />
                    تسجيل الدخول
                  </Link>
                )}
              </div>
            )}
          </div>

          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 bg-brand-orange text-white px-4 py-2 rounded-full font-bold text-sm shadow-sm hover:bg-brand-red-dark hover:shadow transition-all no-underline"
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">السلة</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -left-2 bg-brand-amber text-brand-ink text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-brand-red">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            className="md:hidden p-2 text-white"
            aria-label="القائمة"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      {/* تابات الأقسام */}
      <div className="bg-white border-t border-violet-100">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto min-w-0">
            {SECTION_TABS.map((v) => {
              const active = v.href === '/' ? pathname === '/' : pathname?.startsWith(v.href);
              return (
                <Link
                  key={v.href}
                  href={v.href}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold no-underline transition-all ${
                    active
                      ? 'bg-brand-red text-white shadow-sm shadow-brand-red/30'
                      : 'bg-violet-50 text-brand-ink/60 hover:bg-violet-100 hover:text-brand-red'
                  }`}
                >
                  <span>{v.icon}</span>
                  {v.label}
                </Link>
              );
            })}
          </div>
          <Link
            href={APP_TAB.href}
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 px-3 md:px-4 py-2 rounded-full text-sm font-bold no-underline transition-all ${
              pathname?.startsWith(APP_TAB.href)
                ? 'bg-brand-red text-white shadow-sm shadow-brand-red/30'
                : 'bg-violet-50 text-brand-ink/60 hover:bg-violet-100 hover:text-brand-red'
            }`}
          >
            <span>{APP_TAB.icon}</span>
            <span className="hidden sm:inline">{APP_TAB.label}</span>
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-brand-red-dark border-t border-white/10">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1 text-sm font-semibold">
            <Link href="/restaurants" onClick={() => setMobileOpen(false)} className="text-white/90 hover:text-white no-underline py-2">المطاعم</Link>
            <Link href="/offers" onClick={() => setMobileOpen(false)} className="text-brand-amber hover:text-white no-underline py-2 font-bold">🔥 الدلع مستنيك</Link>
            <Link href="/app" onClick={() => setMobileOpen(false)} className="text-brand-amber hover:text-white no-underline py-2 font-bold">📲 حمّل الأبليكيشن</Link>
            <Link href="/favorites" onClick={() => setMobileOpen(false)} className="text-white/90 hover:text-white no-underline py-2 flex items-center gap-2"><Heart size={16} />المفضلة</Link>
            <Link href="/account/orders" onClick={() => setMobileOpen(false)} className="text-white/90 hover:text-white no-underline py-2 flex items-center gap-2"><ListOrdered size={16} />طلباتي</Link>
            {!isLoggedIn && (
              <Link href="/account/login" onClick={() => setMobileOpen(false)} className="text-white/90 hover:text-white no-underline py-2 flex items-center gap-2"><LogIn size={16} />تسجيل الدخول</Link>
            )}
            <Link href="/about" onClick={() => setMobileOpen(false)} className="text-white/90 hover:text-white no-underline py-2">عن ترباوية</Link>
            <Link href="/join" onClick={() => setMobileOpen(false)} className="text-white/90 hover:text-white no-underline py-2">انضم كمطعم</Link>
            <Link href="/rider/signup" onClick={() => setMobileOpen(false)} className="text-white/90 hover:text-white no-underline py-2">انضم كطيار 🛵</Link>
            <Link href="/owner/login" onClick={() => setMobileOpen(false)} className="text-white/90 hover:text-white no-underline py-2">دخول أصحاب المطاعم</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
