'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingBag, Menu as MenuIcon } from 'lucide-react';
import { getCart } from '@/lib/cart';

export default function Header() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const cart = getCart();
      setCartCount(cart.reduce((n, i) => n + i.quantity, 0));
    };
    update();
    window.addEventListener('terbwya-cart-updated', update);
    return () => window.removeEventListener('terbwya-cart-updated', update);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-brand-red text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.svg" alt="ترباوية" className="w-8 h-8" />
          <span className="text-xl font-extrabold text-white">ترباوية</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          <Link href="/restaurants" className="text-white/90 hover:text-white no-underline">المطاعم</Link>
          <Link href="/about" className="text-white/90 hover:text-white no-underline">عن ترباوية</Link>
          <Link href="/join" className="text-white/90 hover:text-white no-underline">انضم كمطعم</Link>
          <Link href="/owner/login" className="text-white/90 hover:text-white no-underline">دخول أصحاب المطاعم</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 bg-brand-orange text-white px-3 py-2 rounded-xl font-bold text-sm hover:bg-brand-red-dark transition-colors no-underline"
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">السلة</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -left-2 bg-brand-amber text-brand-ink text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <button className="md:hidden p-2 text-white" aria-label="القائمة">
            <MenuIcon size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
