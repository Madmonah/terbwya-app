'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Check, X, Pencil } from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';
import ImageUpload from './ImageUpload';

type MenuItemForm = {
  name_ar: string;
  price: string;
  category: string;
  description_ar: string;
  photo_url: string;
};

const EMPTY_FORM: MenuItemForm = { name_ar: '', price: '', category: '', description_ar: '', photo_url: '' };

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
  const [saving, setSaving] = useState(false);

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(item: any) {
    setForm({
      name_ar: item.name_ar || '',
      price: String(item.price ?? ''),
      category: item.category || '',
      description_ar: item.description_ar || '',
      photo_url: item.photo_url || '',
    });
    setEditingId(item.id);
    setAdding(true);
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
      if (editingId) {
        const { error } = await supa.from('menu_items').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('اتحدّث الصنف');
      } else {
        const { error } = await supa.from('menu_items').insert({ restaurant_id: restaurantId, ...payload });
        if (error) throw error;
        toast.success('اتضاف الصنف');
      }
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
              placeholder="السعر"
              className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="القسم"
              className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
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
                  <div className="text-xs text-brand-ink/50">{m.price} ج {m.category && `· ${m.category}`}</div>
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
