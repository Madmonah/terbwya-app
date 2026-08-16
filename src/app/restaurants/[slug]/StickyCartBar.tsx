'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { getCart, cartTotal } from '@/lib/cart';

// شريط السلة الثابت تحت الشاشة — بيظهر أول ما تضيف صنف (نمط تطبيقات الأكل)
export default function StickyCartBar({ restaurantId }: { restaurantId: string }) {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [sameRestaurant, setSameRestaurant] = useState(true);

  useEffect(() => {
    const update = () => {
      const cart = getCart();
      setCount(cart.reduce((n, i) => n + i.quantity, 0));
      setTotal(cartTotal(cart));
      setSameRestaurant(cart.length === 0 || cart[0].restaurantId === restaurantId);
    };
    update();
    window.addEventListener('terbwya-cart-updated', update);
    return () => window.removeEventListener('terbwya-cart-updated', update);
  }, [restaurantId]);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
      <Link
        href="/cart"
        className="pointer-events-auto max-w-2xl mx-auto flex items-center justify-between gap-3 bg-brand-red text-white rounded-2xl px-5 py-3.5 shadow-xl shadow-brand-red/30 no-underline hover:bg-brand-red-dark transition-colors"
      >
        <span className="flex items-center gap-2 font-black text-sm">
          <span className="relative">
            <ShoppingBag size={20} />
            <span className="absolute -top-2 -right-2 bg-white text-brand-red text-[10px] font-black rounded-full w-4.5 h-4.5 min-w-[18px] min-h-[18px] flex items-center justify-center px-1">
              {count}
            </span>
          </span>
          {sameRestaurant ? 'روح للسلة' : 'سلتك من مطعم تاني'}
        </span>
        <span className="font-black">{total.toLocaleString('ar-EG')} ج.م ←</span>
      </Link>
    </div>
  );
}
