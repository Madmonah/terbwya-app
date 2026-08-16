'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Check, X, Pencil } from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';
import ImageUpload from '@/components/ImageUpload';

type SizeForm = {
  id?: string; // موجود = مقاس محفوظ قبل كده، مش موجود = جديد
  name_ar: string;
  price: string;
};

type MenuItemForm = {
  name_ar: string;
  price: string;
  category: string;
  description_ar: string;
  photo_url: string;
  sizes: SizeForm[];
};

const EMPTY_FORM: MenuItemForm = { name_ar: '', price: '', category: '', description_ar: '', photo_url: '', sizes: [] };

export default function MenuTab({
  restaurantId, menuItems, onToggle, onDelete, onReload,
}: {
  restaurantId: string;
  menuItems: any[];
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onReload: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuItemForm>(EMPTY_FORM);
  const [originalSizeIds, setOriginalSizeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function startAdd() {
    setForm(EMPTY_FORM);
    setOriginalSizeIds([]);
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(item: any) {
    const sizes: SizeForm[] = (item.sizes || [])
      .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
      .map((s: any) => ({ id: s.id, name_ar: s.name_ar || '', price: String(s.price ?? '') }));
    setForm({
      name_ar: item.name_ar || '',
      price: String(item.price ?? ''),
      category: item.category || '',
      description_ar: item.description_ar || '',
      photo_url: item.photo_url || '',
      sizes,
    });
    setOriginalSizeIds(sizes.map((s) => s.id!).filter(Boolean));
    setEditingId(item.id);
    setAdding(true);
  }

  function addSize() {
    setForm((f) => ({ ...f, sizes: [...f.sizes, { name_ar: '', price: '' }] }));
  }

  function updateSize(idx: number, field: 'name_ar' | 'price', value: string) {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  }

  function removeSize(idx: number) {
    setForm((f) => ({ ...f, sizes: f.sizes.filter((_, i) => i !== idx) }));
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name_ar.trim() || !(Number(form.price) > 0)) {
      toast.error('اسم الصنف والسعر مطلوبين');
      return;
    }
    // تحقق من المقاسات: أي مقاس متكتب لازم يبقى له اسم وسعر
    const cleanSizes = form.sizes.filter((s) => s.name_ar.trim() || s.price);
    for (const s of cleanSizes) {
      if (!s.name_ar.trim() || !(Number(s.price) > 0)) {
        toast.error('كل مقاس لازم يكون له اسم وسعر صحيح');
        return;
      }
    }
    setSaving(true);
    try {
      const supa = getSupabaseAuthClient();
      const payload = {
        name_ar: form.name_ar.trim(),
        price: Number(form.price),
        category: form.category.trim() || null,
        description_ar: form.description_ar.trim() || null,
        photo_url: form.photo_url || null,
      };

      let itemId = editingId;
      if (editingId) {
        const { error } = await supa.from('menu_items').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supa
          .from('menu_items')
          .insert({ restaurant_id: restaurantId, ...payload })
          .select('id')
          .single();
        if (error) throw error;
        itemId = inserted.id;
      }

      // مزامنة المقاسات: امسح المحذوف، حدّث الموجود، ضيف الجديد
      const keptIds = cleanSizes.map((s) => s.id).filter(Boolean) as string[];
      const toDelete = originalSizeIds.filter((id) => !keptIds.includes(id));
      if (toDelete.length > 0) {
        await supa.from('menu_item_sizes').delete().in('id', toDelete);
      }
      for (let i = 0; i < cleanSizes.length; i++) {
        const s = cleanSizes[i];
        if (s.id) {
          await supa
            .from('menu_item_sizes')
            .update({ name_ar: s.name_ar.trim(), price: Number(s.price), display_order: i + 1 })
            .eq('id', s.id);
        } else {
          await supa.from('menu_item_sizes').insert({
            menu_item_id: itemId,
            name_ar: s.name_ar.trim(),
            price: Number(s.price),
            display_order: i + 1,
          });
        }
      }

      toast.success(editingId ? 'اتحدّث الصنف' : 'اتضاف الصنف');
      cancel();
      onReload();
    } catch (e) {
      console.error('[MenuTab] save error:', e);
      toast.error('حصل خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {!adding ? (
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 text-brand-red font-bold text-sm hover:underline"
        >
          <Plus size={16} /> ضيف صنف جديد
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <h3 className="font-bold text-brand-ink text-sm">{editingId ? 'تعديل الصنف' : 'صنف جديد'}</h3>
          <ImageUpload
            restaurantId={restaurantId}
            currentUrl={form.photo_url || null}
            onUploaded={(url) => setForm((f) => ({ ...f, photo_url: url }))}
            label="صورة الصنف"
            aspect="aspect-square"
          />
          <input
            value={form.name_ar}
            onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
            placeholder="اسم الصنف"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={form.description_ar}
            onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
            placeholder="وصف الصنف (اختياري)"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              type="number"
              placeholder="السعر الأساسي"
              className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="القسم"
              className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* المقاسات (اختياري): فرخة كاملة / نص / ربع... كل مقاس بسعره */}
          <div className="bg-brand-cream rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-brand-ink/60">
                المقاسات (اختياري) — لو الصنف له أحجام بأسعار مختلفة
              </p>
              <button
                type="button"
                onClick={addSize}
                className="text-xs font-bold text-brand-red hover:underline flex items-center gap-0.5"
              >
                <Plus size={12} /> ضيف مقاس
              </button>
            </div>
            {form.sizes.length === 0 ? (
              <p className="text-[11px] text-brand-ink/40">مفيش مقاسات — الصنف بيتباع بالسعر الأساسي بس</p>
            ) : (
              <div className="space-y-1.5">
                {form.sizes.map((s, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <input
                      value={s.name_ar}
                      onChange={(e) => updateSize(i, 'name_ar', e.target.value)}
                      placeholder="اسم المقاس (مثلاً: نص فرخة)"
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                    />
                    <input
                      value={s.price}
                      onChange={(e) => updateSize(i, 'price', e.target.value)}
                      type="number"
                      placeholder="السعر"
                      className="w-20 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                    />
                    <button type="button" onClick={() => removeSize(i)} className="text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 bg-brand-red text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <Check size={14} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={cancel} className="flex items-center gap-1 text-brand-ink/50 font-bold px-4 py-2 rounded-lg text-sm">
              <X size={14} /> إلغاء
            </button>
          </div>
        </div>
      )}

      {menuItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-brand-ink/50">لسه مفيش أصناف</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {menuItems.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name_ar} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-brand-cream shrink-0 flex items-center justify-center text-lg">🍽️</div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-brand-ink text-sm truncate">{m.name_ar}</div>
                  <div className="text-xs text-brand-ink/50">
                    {m.price} ج {m.category && `· ${m.category}`}
                    {(m.sizes?.length || 0) > 0 && ` · ${m.sizes.length} مقاسات`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onToggle(m.id, m.is_available)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {m.is_available ? 'متاح' : 'غير متاح'}
                </button>
                <button onClick={() => startEdit(m)} className="text-brand-ink/40 hover:text-brand-red">
                  <Pencil size={16} />
                </button>
                <button onClick={() => onDelete(m.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
