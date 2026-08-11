'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSupabaseAuthClient } from '@/lib/supabase';
import { CuisineCategory } from '@/lib/types';

type Step = 1 | 2 | 3 | 4;

type DraftMenuItem = {
  name_ar: string;
  price: string;
  category: string;
  description_ar: string;
};

const CITIES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الساحل الشمالي',
  'العين السخنة', 'الغردقة', 'شرم الشيخ', 'المنصورة', 'طنطا',
  'الزقازيق', 'الفيوم', 'أسيوط', 'مدينة 6 أكتوبر', 'أخرى',
];

function slugify(name: string) {
  const base = name
    .trim()
    .replace(/[ً-ٟ]/g, '') // remove Arabic diacritics
    .replace(/\s+/g, '-')
    .replace(/[^؀-ۿa-zA-Z0-9-]/g, '');
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'restaurant'}-${suffix}`;
}

export default function JoinWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const ownerIdFromUrl = params.get('owner');

  const [step, setStep] = useState<Step>(1);
  const [ownerId, setOwnerId] = useState<string | null>(ownerIdFromUrl);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [categories, setCategories] = useState<CuisineCategory[]>([]);

  // Step 1: basic info
  const [name, setName] = useState('');
  const [cuisineCategoryId, setCuisineCategoryId] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: location
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');

  // Step 3: menu items
  const [menuItems, setMenuItems] = useState<DraftMenuItem[]>([
    { name_ar: '', price: '', category: '', description_ar: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  // Verify auth + load owner id + categories
  useEffect(() => {
    (async () => {
      try {
        const supa = getSupabaseAuthClient();
        const { data: { session } } = await supa.auth.getSession();
        if (!session?.user) {
          router.replace('/owner/signup');
          return;
        }

        let oId = ownerIdFromUrl;
        if (!oId) {
          const { data: ownerRow } = await supa
            .from('restaurant_owners')
            .select('id')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();
          oId = ownerRow?.id || null;
        }
        if (!oId) {
          router.replace('/owner/signup');
          return;
        }
        setOwnerId(oId);

        const { data: cats } = await supa.from('cuisine_categories').select('*').order('display_order');
        setCategories(cats || []);
      } catch (e) {
        console.error('[join] auth check error:', e);
        router.replace('/owner/login');
      } finally {
        setCheckingAuth(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addMenuItem() {
    setMenuItems((items) => [...items, { name_ar: '', price: '', category: '', description_ar: '' }]);
  }

  function removeMenuItem(idx: number) {
    setMenuItems((items) => items.filter((_, i) => i !== idx));
  }

  function updateMenuItem(idx: number, field: keyof DraftMenuItem, value: string) {
    setMenuItems((items) => items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function validateStep(current: Step): string | null {
    if (current === 1) {
      if (!name.trim()) return 'اسم المطعم مطلوب';
      if (!cuisineCategoryId) return 'اختار نوع المطبخ';
    }
    if (current === 2) {
      if (!city) return 'اختار المدينة';
      if (!address.trim()) return 'العنوان بالتفصيل مطلوب';
    }
    if (current === 3) {
      const valid = menuItems.filter((m) => m.name_ar.trim() && Number(m.price) > 0);
      if (valid.length === 0) return 'ضيف صنف واحد على الأقل بالاسم والسعر';
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  }

  function goBack() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function handlePublish() {
    if (!ownerId) return;
    setSubmitting(true);
    try {
      const supa = getSupabaseAuthClient();
      const slug = slugify(name);

      const { data: restaurant, error: restError } = await supa
        .from('restaurants')
        .insert({
          owner_id: ownerId,
          slug,
          name: name.trim(),
          description: description.trim() || null,
          cuisine_category_id: cuisineCategoryId,
          city,
          district: district.trim() || null,
          address: address.trim(),
          cover_photo_url: coverPhotoUrl.trim() || null,
          status: 'pending_review',
        })
        .select('id, slug')
        .single();

      if (restError || !restaurant) throw restError || new Error('تعذّر إنشاء المطعم');

      const validItems = menuItems.filter((m) => m.name_ar.trim() && Number(m.price) > 0);
      if (validItems.length > 0) {
        const { error: menuError } = await supa.from('menu_items').insert(
          validItems.map((m, idx) => ({
            restaurant_id: restaurant.id,
            name_ar: m.name_ar.trim(),
            price: Number(m.price),
            category: m.category.trim() || null,
            description_ar: m.description_ar.trim() || null,
            display_order: idx,
          }))
        );
        if (menuError) throw menuError;
      }

      // ننشر المطعم فورًا (MVP: بدون مراجعة يدوية — ممكن تتفعّل لاحقًا)
      const { error: publishError } = await supa.rpc('publish_own_restaurant', {
        p_restaurant_id: restaurant.id,
      });
      if (publishError) throw publishError;

      setPublishedSlug(restaurant.slug);
      toast.success('اتنشر مطعمك بنجاح! 🎉');
    } catch (e: any) {
      console.error('[join] publish error:', e);
      toast.error('حصل خطأ في نشر المطعم، حاول تاني');
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
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

  if (publishedSlug) {
    return (
      <>
        <Header />
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <span className="relative w-16 h-16 mx-auto mb-4 rounded-full bg-white/95 p-0.5 overflow-hidden block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-icon.png"
              alt="ترباوية"
              className="w-full h-full rounded-full object-cover scale-[1.7]"
            />
          </span>
          <h1 className="text-2xl font-extrabold text-brand-ink mb-2">اتنشر مطعمك على ترباوية!</h1>
          <p className="text-brand-ink/60 mb-8">دلوقتي تقدر تدير مطعمك وتشوف الطلبات من الداشبورد بتاعك.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/restaurants/${publishedSlug}`}
              className="inline-block bg-brand-cream border border-brand-amber/40 text-brand-ink font-bold px-6 py-3 rounded-xl no-underline"
            >
              شوف صفحة مطعمك
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-violet-700 to-violet-500 text-white">
        <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full bg-black/10 blur-3xl" />
        <div className="relative max-w-2xl mx-auto px-4 py-10 md:py-14 text-center">
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-xs font-bold mb-3">
            🏪 لأصحاب المطاعم
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold">سجّل مطعمك في ترباوية</h1>
        </div>
      </section>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-brand-ink/60 mb-3 text-sm">خطوة {step} من 4</p>

        <div className="flex gap-1.5 mb-8">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                n <= step ? 'bg-gradient-to-r from-violet-500 to-violet-700' : 'bg-brand-cream'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          {step === 1 && (
            <div className="space-y-3">
              <h2 className="font-bold text-brand-ink mb-1">بيانات المطعم الأساسية</h2>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم المطعم *"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              />
              <select
                value={cuisineCategoryId}
                onChange={(e) => setCuisineCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="">اختار نوع المطبخ *</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name_ar}
                  </option>
                ))}
              </select>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف قصير عن المطعم (اختياري)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                rows={3}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="font-bold text-brand-ink mb-1">الموقع والتواصل</h2>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="">اختار المدينة *</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="الحي/المنطقة"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="العنوان بالتفصيل *"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                rows={2}
              />
              <input
                value={coverPhotoUrl}
                onChange={(e) => setCoverPhotoUrl(e.target.value)}
                placeholder="رابط صورة غلاف المطعم (اختياري)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                dir="ltr"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-brand-ink mb-1">أصناف المنيو</h2>
              {menuItems.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2 relative">
                  {menuItems.length > 1 && (
                    <button
                      onClick={() => removeMenuItem(idx)}
                      className="absolute top-2 left-2 text-red-500 hover:text-red-700"
                      aria-label="حذف الصنف"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <input
                    value={item.name_ar}
                    onChange={(e) => updateMenuItem(idx, 'name_ar', e.target.value)}
                    placeholder="اسم الصنف *"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      value={item.price}
                      onChange={(e) => updateMenuItem(idx, 'price', e.target.value)}
                      placeholder="السعر (ج.م) *"
                      type="number"
                      className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      value={item.category}
                      onChange={(e) => updateMenuItem(idx, 'category', e.target.value)}
                      placeholder="القسم (مقبلات، أساسي...)"
                      className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <input
                    value={item.description_ar}
                    onChange={(e) => updateMenuItem(idx, 'description_ar', e.target.value)}
                    placeholder="وصف الصنف (اختياري)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <button
                onClick={addMenuItem}
                className="flex items-center gap-1.5 text-brand-red font-bold text-sm hover:underline"
              >
                <Plus size={16} /> ضيف صنف تاني
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-bold text-brand-ink mb-1">مراجعة ونشر</h2>
              <div className="text-sm space-y-2">
                <p><span className="font-bold">اسم المطعم:</span> {name}</p>
                <p><span className="font-bold">المدينة:</span> {city} {district && `- ${district}`}</p>
                <p><span className="font-bold">العنوان:</span> {address}</p>
                <p><span className="font-bold">عدد الأصناف:</span> {menuItems.filter((m) => m.name_ar.trim() && Number(m.price) > 0).length}</p>
              </div>
              <p className="text-xs text-brand-ink/50">
                بالضغط على "نشر المطعم"، مطعمك هيظهر فورًا على ترباوية وتقدر تستقبل طلبات.
              </p>
              <button
                onClick={handlePublish}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-extrabold py-3 rounded-xl hover:shadow-lg hover:shadow-brand-red/20 transition-all disabled:opacity-50"
              >
                {submitting ? 'جاري النشر...' : 'نشر المطعم 🚀'}
              </button>
            </div>
          )}

          {step < 4 && (
            <div className="flex justify-between mt-6">
              <button
                onClick={goBack}
                disabled={step === 1}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-brand-ink/60 disabled:opacity-0"
              >
                رجوع
              </button>
              <button
                onClick={goNext}
                className="bg-brand-red text-white font-bold px-6 py-2.5 rounded-xl hover:bg-brand-red-dark transition-colors"
              >
                التالي
              </button>
            </div>
          )}
          {step === 4 && (
            <div className="flex justify-start mt-4">
              <button
                onClick={goBack}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-brand-ink/60"
              >
                رجوع
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
