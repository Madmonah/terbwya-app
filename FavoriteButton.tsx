'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabaseAuthClient } from '@/lib/supabase';

export default function FavoriteButton({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supa = getSupabaseAuthClient();
        const { data: { session } } = await supa.auth.getSession();
        if (!session?.user) {
          setChecked(true);
          return;
        }
        const { data: customer } = await supa
          .from('customers')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();
        if (customer) {
          setCustomerId(customer.id);
          const { data: fav } = await supa
            .from('favorites')
            .select('id')
            .eq('customer_id', customer.id)
            .eq('restaurant_id', restaurantId)
            .maybeSingle();
          setIsFavorite(!!fav);
        }
      } catch {
        // مفيش
      } finally {
        setChecked(true);
      }
    })();
  }, [restaurantId]);

  async function toggle() {
    if (!customerId) {
      toast('سجّل دخول الأول عشان تضيف للمفضلة', { icon: '💛' });
      router.push('/account/login');
      return;
    }
    setLoading(true);
    try {
      const supa = getSupabaseAuthClient();
      if (isFavorite) {
        await supa.from('favorites').delete().eq('customer_id', customerId).eq('restaurant_id', restaurantId);
        setIsFavorite(false);
        toast.success('اتشال من المفضلة');
      } else {
        await supa.from('favorites').insert({ customer_id: customerId, restaurant_id: restaurantId });
        setIsFavorite(true);
        toast.success('اتضاف للمفضلة ❤️');
      }
    } catch (e) {
      toast.error('حصل خطأ، حاول تاني');
    } finally {
      setLoading(false);
    }
  }

  if (!checked) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label="أضف للمفضلة"
      className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
        isFavorite ? 'bg-brand-red border-brand-red text-white' : 'bg-white border-gray-200 text-brand-ink/40 hover:text-brand-red'
      }`}
    >
      <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  );
}
