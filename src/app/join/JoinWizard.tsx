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
import ImageUpload from '@/components/ImageUpload';

type Step = 1 | 2 | 3 | 4;

type DraftSize = { name_ar: string; price: string };

type DraftMenuItem = {
  name_ar: string;
  price: string;
  category: string;
  description_ar: string;
  photo_url: string;
  sizes: DraftSize[];
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
  const [restLocation, setRestLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // المطعم بيتعمل كمسودة بعد خطوة الموقع — عشان رفع الصور يشتغل في خطوة المنيو
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);

  // Step 3: menu items
  const [menuItems, setMenuItems] = useState<DraftMenuItem[]>([
    { name_ar: '', price: '', category: '', description_ar: '', photo_url: '', sizes: [] },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  function captureRestaurantLocation() {
    if (!('geolocation' in navigator)) {
      toast.error('المتصفح مش بيدعم تحديد الموقع');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRestLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success('اتحدد موقع المطعم 📍 — العملاء هيشوفوا بعده عنهم والطيارين هيوصلوله بسهولة');
      },
      () => {
        setLocating(false);
        toast.error('مقدرناش نحدد الموقع — اسمح بإذن الموقع وحاول تاني');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

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
    setMenuItems((items) => [...items, { name_ar: '', price: '', category: '', description_ar: '', photo_url: '', sizes: [] }]);
  }

  function addItemSize(itemIdx: number) {
    setMenuItems((items) =>
      items.map((it, i) => (i === itemIdx ? { ...it, sizes: [...it.sizes, { name_ar: '', price: '' }] } : it))
    );
  }

  function updateItemSize(itemIdx: number, sizeIdx: number, field: 'name_ar' | 'price', value: string) {
    setMenuItems((items) =>
      items.map((it, i) =>
        i === itemIdx
          ? { ...it, sizes: it.sizes.map((s, j) => (j === sizeIdx ? { ...s, [field]: value } : s)) }
          : it
      )
    );
  }

  function removeItemSize(itemIdx: number, sizeIdx: number) {
    setMenuItems((items) =>
      items.map((it, i) => (i === itemIdx ? { ...it, sizes: it.sizes.filter((_, j) => j !== sizeIdx) } : it))
    );
  }

  function setItemPhoto(itemIdx: number, url: string) {
    setMenuItems((items) => items.map((it, i) => (i === itemIdx ? { ...it, photo_url: url } : it)));
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

  async function goNext() {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }

    // بعد خطوة الموقع: نعمل المطعم كمسودة عشان رفع الصور يشتغل في الخطوة الجاية
    if (step === 2 && ownerId) {
      setCreatingDraft(true);
      try {
        const supa = getSupabaseAuthClient();
        const fields = {
          name: name.trim(),
          description: description.trim() || null,
          cuisine_category_id: cuisineCategoryId,
          city,
          district: district.trim() || null,
          address: address.trim(),
          lat: restLocation?.lat ?? null,
          lng: restLocation?.lng ?? null,
        };
        if (restaurantId) {
          // رجع وعدّل البيانات؟ نحدّث المسودة الموجودة
          const { error } = await supa.from('restaurants').update(fields).eq('id', restaurantId);
          if (error) throw error;
        } else {
          const { data: created, error } = await supa
            .from('restaurants')
            .insert({
              owner_id: ownerId,
              slug: slugify(name),
              status: 'pending_review',
              ...fields,
            })
            .select('id')
            .single();
          if (error || !created) throw error || new Error('draft_failed');
          setRestaurantId(created.id);
        }
      } catch (e) {
        console.error('[join] draft error:', e);
        toast.error('حصل خطأ، حاول تاني');
        setCreatingDraft(false);
        return;
      }
      setCreatingDraft(false);
    }

    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  }

  function goBack() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function handlePublish() {
    if (!ownerId || !restaurantId) return;
    setSubmitting(true);
    try {
      const supa = getSupabaseAuthClient();

      // تحديث بيانات المسودة النهائية (لو رجع وعدّل حاجة)
      const { data: restaurant, error: restError } = await supa
        .from('restaurants')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          cuisine_category_id: cuisineCategoryId,
          city,
          district: district.trim() || null,
          address: address.trim(),
          cover_photo_url: coverPhotoUrl || null,
          lat: restLocation?.lat ?? null,
          lng: restLocation?.lng ?? null,
        })
        .eq('id', restaurantId)
        .select('id, slug')
        .single();

      if (restError || !restaurant) throw restError || new Error('تعذّر تحديث المطعم');

      const validItems = menuItems.filter((m) => m.name_ar.trim() && Number(m.price) > 0);
      for (let idx = 0; idx < validItems.length; idx++) {
        const m = validItems[idx];
        const { data: inserted, error: menuError } = await supa
          .from('menu_items')
          .insert({
            restaurant_id: restaurant.id,
            name_ar: m.name_ar.trim(),
            price: Number(m.price),
            category: m.category.trim() || null,
            description_ar: m.description_ar.trim() || null,
            photo_url: m.photo_url || null,
            display_order: idx,
          })
          .select('id')
          .single();
        if (menuError || !inserted) throw menuError;

        // المقاسات (فرخة/نص/ربع...) لو متضافة
        const validSizes = m.sizes.filter((s) => s.name_ar.trim() && Number(s.price) > 0);
        if (validSizes.length > 0) {
          const { error: sizesError } = await supa.from('menu_item_sizes').insert(
            validSizes.map((s, i) => ({
              menu_item_id: inserted.id,
              name_ar: s.name_ar.trim(),
              price: Number(s.price),
              display_order: i + 1,
            }))
          );
          if (sizesError) throw sizesError;
        }
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
              className="w-full h-full rounded-full object-cover scale-[1.55]"
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
              {/* موقع المطعم بالـ GPS — عشان "الأقرب ليك" والطيارين */}
              {restLocation ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-bold text-green-700">📍 موقع المطعم اتحدد</span>
                  <button
                    type="button"
                    onClick={captureRestaurantLocation}
                    disabled={locating}
                    className="text-xs font-bold text-green-700 underline"
                  >
                    تحديث
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={captureRestaurantLocation}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-brand-red/40 text-brand-red font-bold py-2.5 rounded-lg text-sm disabled:opacity-50"
                >
                  📍 {locating ? 'جاري التحديد...' : 'حدد موقع المطعم بالـ GPS (وأنت في المطعم)'}
                </button>
              )}
              <p className="text-[11px] text-brand-ink/40">
                الموقع بيخلي مطعمك يظهر في "الأقرب ليك" والطيارين يوصلولك من غير لف.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-brand-ink mb-1">الصور والمنيو</h2>

              {restaurantId && (
                <div className="bg-brand-cream rounded-lg p-3">
                  <ImageUpload
                    restaurantId={restaurantId}
                    currentUrl={coverPhotoUrl || null}
                    onUploaded={setCoverPhotoUrl}
                    label="صورة غلاف المطعم (بتظهر فوق صفحتك)"
                    aspect="aspect-video"
                  />
                </div>
              )}

              <h3 className="font-bold text-brand-ink text-sm">أصناف المنيو</h3>
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
                  {restaurantId && (
                    <ImageUpload
                      restaurantId={restaurantId}
                      currentUrl={item.photo_url || null}
                      onUploaded={(url) => setItemPhoto(idx, url)}
                      label="صورة الصنف (اختياري)"
                      aspect="aspect-square"
                    />
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

                  {/* المقاسات: فرخة كاملة / نص / ربع... */}
                  <div className="bg-brand-cream rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-bold text-brand-ink/60">مقاسات بأسعار مختلفة؟ (اختياري)</p>
                      <button
                        type="button"
                        onClick={() => addItemSize(idx)}
                        className="text-[11px] font-bold text-brand-red hover:underline flex items-center gap-0.5"
                      >
                        <Plus size={11} /> ضيف مقاس
                      </button>
                    </div>
                    {item.sizes.length === 0 ? (
                      <p className="text-[10px] text-brand-ink/40">مثال: فرخة كاملة 180 / نص فرخة 95 / ربع 55</p>
                    ) : (
                      <div className="space-y-1.5">
                        {item.sizes.map((s, sIdx) => (
                          <div key={sIdx} className="flex gap-1.5 items-center">
                            <input
                              value={s.name_ar}
                              onChange={(e) => updateItemSize(idx, sIdx, 'name_ar', e.target.value)}
                              placeholder="اسم المقاس"
                              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                            />
                            <input
                              value={s.price}
                              onChange={(e) => updateItemSize(idx, sIdx, 'price', e.target.value)}
                              type="number"
                              placeholder="السعر"
                              className="w-20 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => removeItemSize(idx, sIdx)}
                              className="text-red-400 hover:text-red-600 shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                disabled={creatingDraft}
                className="bg-brand-red text-white font-bold px-6 py-2.5 rounded-xl hover:bg-brand-red-dark transition-colors disabled:opacity-50"
              >
                {creatingDraft ? 'ثواني...' : 'التالي'}
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
