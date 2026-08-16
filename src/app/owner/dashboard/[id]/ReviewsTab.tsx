'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Star, MessageCircle } from 'lucide-react';
import { getSupabaseAuthClient } from '@/lib/supabase';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  owner_reply: string | null;
  owner_reply_at: string | null;
  created_at: string;
};

export default function ReviewsTab({ restaurantId }: { restaurantId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const supa = getSupabaseAuthClient('owner');
      const { data } = await supa
        .from('reviews')
        .select('id, rating, comment, owner_reply, owner_reply_at, created_at')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(100);
      setReviews((data as Review[]) || []);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitReply(reviewId: string) {
    if (!replyText.trim()) {
      toast.error('اكتب الرد الأول');
      return;
    }
    setSaving(true);
    try {
      const supa = getSupabaseAuthClient('owner');
      const { error } = await supa
        .from('reviews')
        .update({ owner_reply: replyText.trim(), owner_reply_at: new Date().toISOString() })
        .eq('id', reviewId);
      if (error) throw error;
      toast.success('اتنشر ردك');
      setReplyingId(null);
      setReplyText('');
      load();
    } catch {
      toast.error('حصل خطأ في نشر الرد');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-brand-ink/50 py-8 text-center">جاري تحميل التقييمات...</p>;
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-brand-ink/50">
        <Star className="w-8 h-8 mx-auto mb-2 text-brand-ink/20" />
        لسه مفيش تقييمات — التقييمات بتيجي من العملاء بعد ما يستلموا طلباتهم
      </div>
    );
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
        <div className="text-3xl font-black text-brand-orange">⭐ {avg.toFixed(1)}</div>
        <div className="text-sm text-brand-ink/60">من {reviews.length} تقييم — ردودك بتظهر للعملاء في صفحة مطعمك</div>
      </div>

      {reviews.map((r) => (
        <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-brand-orange text-sm">
              {'⭐'.repeat(r.rating)}
              <span className="text-brand-ink/40 mr-1">({r.rating}/5)</span>
            </div>
            <span className="text-xs text-brand-ink/40">
              {new Date(r.created_at).toLocaleDateString('ar-EG')}
            </span>
          </div>
          {r.comment && <p className="text-sm text-brand-ink/80 mb-2">{r.comment}</p>}

          {r.owner_reply ? (
            <div className="bg-brand-cream rounded-lg p-3 mt-2">
              <p className="text-[10px] font-bold text-brand-ink/50 mb-0.5">ردك:</p>
              <p className="text-sm text-brand-ink/70">{r.owner_reply}</p>
            </div>
          ) : replyingId === r.id ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="اكتب ردك على التقييم ده..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => submitReply(r.id)}
                  disabled={saving}
                  className="bg-brand-red text-white font-bold text-xs px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'جاري النشر...' : 'انشر الرد'}
                </button>
                <button
                  onClick={() => { setReplyingId(null); setReplyText(''); }}
                  className="text-brand-ink/50 font-bold text-xs px-4 py-2"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setReplyingId(r.id); setReplyText(''); }}
              className="flex items-center gap-1 text-brand-red font-bold text-xs mt-1 hover:underline"
            >
              <MessageCircle size={12} /> رد على التقييم
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
