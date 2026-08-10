'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Heart } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseAuthClient } from '@/lib/supabase';

export default function FavoritesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const supa = getSupabaseAuthClient();
        const { data: { session } } = await supa.auth.getSession();
        if (!session?.user) {
          router.replace('/account/login');
          return;
        }

        const { data: customer } = await supa
          .from('customers')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (!customer) {
          setRestaurants([]);
          setLoading(false);
          return;
        }

        const { data: favs } = await supa
          .from('favorites')
          .select('restaurant:restaurants(id, slug, name, cover_photo_url, city, rating, reviews_count, avg_delivery_minutes)')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });

        setRestaurants((favs || []).map((f: any) => f.restaurant).filter(Boolean));
      } catch (e) {
        console.error('[favorites] load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-24 text-center">
          <Loader2 className="w-8 h-8 text-brand-red animate-spin mx-auto" />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-brand-ink mb-6 flex items-center gap-2">
          <Heart className="text-brand-red" fill="currentColor" size={22} />
          المفضلة
        </h1>

        {restaurants.length === 0 ? (
          <div className="bg-white border border-dashed border-brand-amber rounded-xl p-10 text-center text-brand-ink/60">
            <p className="mb-4">لسه مفيش مطاعم في المفضلة</p>
            <Link href="/restaurants" className="text-brand-red font-bold hover:underline">اتصفح المطاعم</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {restaurants.map((r) => (
              <Link
                key={r.id}
                href={`/restaurants/${r.slug}`}
                className="block bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all no-underline"
              >
                <div className="aspect-[4/3] bg-brand-cream flex items-center justify-center overflow-hidden">
                  {r.cover_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.cover_photo_url} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-4xl">🍽️</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-bold text-brand-ink text-sm leading-snug line-clamp-1">{r.name}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-brand-ink/50">
                    {r.city && <span>{r.city}</span>}
                    {r.avg_delivery_minutes && <span>· {r.avg_delivery_minutes} د</span>}
                  </div>
                  {r.rating != null && (
                    <div className="text-xs text-brand-orange font-bold mt-1">⭐ {r.rating.toFixed(1)} ({r.reviews_count})</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
