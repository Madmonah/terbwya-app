'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save } from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';
import ImageUpload from '@/components/ImageUpload';
import BranchesSection from './BranchesSection';

export default function SettingsTab({
  restaurantId,
  restaurant,
  onReload,
}: {
  restaurantId: string;
  restaurant: any;
  onReload: () => void;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(restaurant.is_open);
  const [description, setDescription] = useState(restaurant.description || '');
  const [city, setCity] = useState(restaurant.city || '');
  const [district, setDistrict] = useState(restaurant.district || '');
  const [address, setAddress] = useState(restaurant.address || '');
  const [deliveryFee, setDeliveryFee] = useState(String(restaurant.delivery_fee_egp ?? 0));
  const [minOrder, setMinOrder] = useState(String(restaurant.min_order_egp ?? 0));
  const [avgDeliveryMinutes, setAvgDeliveryMinutes] = useState(String(restaurant.avg_delivery_minutes ?? ''));
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(restaurant.cover_photo_url || '');
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (Number(deliveryFee) < 0 || Number(minOrder) < 0) {
      toast.error('القيم لازم تكون صفر أو أكبر');
      return;
    }
    setSaving(true);
    try {
      const supa = getSupabaseAuthClient('owner');
      const { error } = await supa
        .from('restaurants')
        .update({
          is_open: isOpen,
          description: description.trim() || null,
          city: city.trim() || null,
          district: district.trim() || null,
          address: address.trim() || null,
          delivery_fee_egp: Number(deliveryFee) || 0,
          min_order_egp: Number(minOrder) || 0,
          avg_delivery_minutes: avgDeliveryMinutes ? Number(avgDeliveryMinutes) : null,
          cover_photo_url: coverPhotoUrl || null,
          logo_url: logoUrl || null,
        })
        .eq('id', restaurantId);
      if (error) throw error;
      toast.success('اتحفظت الإعدادات');
      onReload();
    } catch (e) {
      console.error('[SettingsTab] save error:', e);
      toast.error('حصل خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-brand-ink text-sm">حالة المطعم</p>
          <p className="text-xs text-brand-ink/50 mt-0.5">
            {isOpen ? 'المطعم شغال دلوقتي وبيستقبل طلبات' : 'المطعم مقفول — العملاء مش هيقدروا يطلبوا'}
          </p>
        </div>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${isOpen ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${isOpen ? 'translate-x-[-1.5rem]' : 'translate-x-[-0.25rem]'} right-1`} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
        <h3 className="font-bold text-brand-ink text-sm">صور المطعم</h3>
        <div className="flex flex-wrap gap-4">
          <ImageUpload
            restaurantId={restaurantId}
            currentUrl={coverPhotoUrl}
            onUploaded={setCoverPhotoUrl}
            label="صورة الغلاف"
            aspect="aspect-video"
          />
          <ImageUpload
            restaurantId={restaurantId}
            currentUrl={logoUrl}
            onUploaded={setLogoUrl}
            label="الشعار"
            aspect="aspect-square"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <h3 className="font-bold text-brand-ink text-sm mb-1">بيانات المطعم</h3>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف المطعم"
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="المدينة"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="الحي"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="العنوان بالتفصيل"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <h3 className="font-bold text-brand-ink text-sm mb-1">التوصيل</h3>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] text-brand-ink/50 mb-1">رسوم التوصيل (ج.م)</label>
            <input
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              type="number"
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-brand-ink/50 mb-1">الحد الأدنى للطلب (ج.م)</label>
            <input
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              type="number"
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-brand-ink/50 mb-1">مدة التوصيل (دقيقة)</label>
            <input
              value={avgDeliveryMinutes}
              onChange={(e) => setAvgDeliveryMinutes(e.target.value)}
              type="number"
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <BranchesSection restaurantId={restaurantId} />

      <div className="bg-violet-50 border border-violet-100 rounded-xl p-3.5 text-xs text-brand-ink/70">
        🏷️ <span className="font-bold text-brand-ink">الخصومات والعروض</span> بقى ليها تبويب خاص —
        روح لتبويب "العروض" فوق عشان تجدول عروضك بتواريخ بداية ونهاية.
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-brand-red text-white font-extrabold px-5 py-3 rounded-xl disabled:opacity-50"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
}
