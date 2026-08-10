'use client';

import { CartItem } from './types';

const CART_KEY = 'terbwya_cart_v1';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('terbwya-cart-updated'));
}

// السلة مربوطة بمطعم واحد بس في نفس الوقت (زي أغلب منصات طلب الطعام)
export function addToCart(item: CartItem): { ok: boolean; reason?: string } {
  const cart = getCart();
  if (cart.length > 0 && cart[0].restaurantId !== item.restaurantId) {
    return { ok: false, reason: 'DIFFERENT_RESTAURANT' };
  }
  const existingIdx = cart.findIndex(
    (c) => c.menuItemId === item.menuItemId && c.menuSizeId === item.menuSizeId
  );
  if (existingIdx >= 0) {
    cart[existingIdx].quantity += item.quantity;
  } else {
    cart.push(item);
  }
  saveCart(cart);
  return { ok: true };
}

export function clearCartAndAdd(item: CartItem) {
  saveCart([item]);
}

export function updateQuantity(menuItemId: string, menuSizeId: string | null, quantity: number) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter((c) => !(c.menuItemId === menuItemId && c.menuSizeId === menuSizeId));
  } else {
    cart = cart.map((c) =>
      c.menuItemId === menuItemId && c.menuSizeId === menuSizeId ? { ...c, quantity } : c
    );
  }
  saveCart(cart);
}

export function clearCart() {
  saveCart([]);
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}
