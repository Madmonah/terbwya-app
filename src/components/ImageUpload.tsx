'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabaseAuthClient } from '@/lib/supabase';

// رفع صورة واحدة لباكت restaurant-photos جوه مجلد المطعم، وإرجاع الرابط العام
export default function ImageUpload({
  restaurantId,
  currentUrl,
  onUploaded,
  label,
  aspect = 'aspect-video',
}: {
  restaurantId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  label: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('لازم تختار صورة');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة أكبر من 5 ميجا');
      return;
    }
    setUploading(true);
    try {
      const supa = getSupabaseAuthClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${restaurantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supa.storage.from('restaurant-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supa.storage.from('restaurant-photos').getPublicUrl(path);
      setPreview(data.publicUrl);
      onUploaded(data.publicUrl);
      toast.success('اترفعت الصورة');
    } catch (e) {
      console.error('[ImageUpload] error:', e);
      toast.error('حصل خطأ في رفع الصورة');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-xs font-bold text-brand-ink/60 mb-1.5">{label}</label>
      <div className={`relative ${aspect} w-full max-w-xs rounded-xl overflow-hidden border border-dashed border-gray-300 bg-brand-cream flex items-center justify-center`}>
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => { setPreview(null); onUploaded(''); }}
              className="absolute top-1.5 left-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-1.5 text-brand-ink/40 hover:text-brand-ink/60 py-6"
          >
            {uploading ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
            <span className="text-xs font-bold">{uploading ? 'جاري الرفع...' : 'اضغط لرفع صورة'}</span>
          </button>
        )}
      </div>
      {preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs font-bold text-brand-red mt-1.5 hover:underline"
        >
          {uploading ? 'جاري الرفع...' : 'تغيير الصورة'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
