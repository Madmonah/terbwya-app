'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabaseClient } from '@/lib/supabase';

const STATUS_STEPS = [
  { key: 'pending', label: 'قيد الانتظار', emoji: '⏳' },
  { key: 'confirmed', label: 'اتأكد', emoji: '✅' },
  { key: 'preparing', label: 'بيتحضّر', emoji: '👨‍🍳' },
  { key: 'out_for_delivery', label: 'في الطريق', emoji: '🛵' },
  { key: 'delivered', label: 'اتسلّم', emoji: '🎉' },
];

export default function OrderTracker({
  orderId,
  initialStatus,
  customerPhone,
  hasReview,
}: {
  orderId: string;
  initialStatus: string;
  customerPhone: string;
  hasReview: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [reviewed, setReviewed] = useState(hasReview);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // اشتراك Realtime: تحديث حالة الطلب فورًا بدون ما العميل يعمل refresh
  useEffect(() => {
    const supa = getSupabaseClient();
    const channel = supa
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const newStatus = (payload.new as any).status;
          if (newStatus && newStatus !== status) {
            setStatus(newStatus);
            toast.success('اتحدثت حالة طلبك! 🔔');
          }
        }
      )
      .subscribe();

    return () => {
      supa.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const isCancelled = status === 'cancelled';
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === status);

  async function submitReview() {
    if (rating === 0) {
      toast.error('اختار تقييم بالنجوم الأول');
      return;
    }
    setSubmitting(true);
    try {
      const supa = getSupabaseClient();
      const { error } = await supa.rpc('submit_review', {
        p_order_id: orderId,
        p_rating: rating,
        p_comment: comment.trim() || null,
        p_customer_phone: customerPhone,
      });
      if (error) throw error;
      setReviewed(true);
      toast.success('شكرًا لتقييمك! 🌟');
    } catch (e: any) {
      console.error('[order] review error:', e);
      toast.error(e?.message === 'already_reviewed' ? 'اتقيّم الطلب ده قبل كده' : 'حصل خطأ، حاول تاني');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {isCancelled ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-center font-bold mb-6">
          اتلغى الطلب
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <div className="flex justify-between">
            {STATUS_STEPS.map((s, idx) => (
              <div key={s.key} className="flex flex-col items-center flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm mb-1 transition-colors ${
                    idx <= currentStepIdx ? 'bg-brand-red text-white' : 'bg-brand-cream text-brand-ink/30'
                  }`}
                >
                  {s.emoji}
                </div>
                <span className={`text-[10px] text-center font-bold ${idx <= currentStepIdx ? 'text-brand-ink' : 'text-brand-ink/30'}`}>
                  {s.label}
                </span>
                {idx < STATUS_STEPS.length - 1 && (
                  <div className={`h-0.5 w-full mt-[-14px] transition-colors ${idx < currentStepIdx ? 'bg-brand-red' : 'bg-brand-cream'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'delivered' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          {reviewed ? (
            <p className="text-center text-sm text-brand-ink/60">✅ شكرًا لتقييمك للطلب ده</p>
          ) : (
            <>
              <h3 className="font-bold text-brand-ink mb-3 text-sm">قيّم تجربتك</h3>
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <Star
                      size={28}
                      className={n <= (hoverRating || rating) ? 'text-brand-orange' : 'text-gray-200'}
                      fill={n <= (hoverRating || rating) ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="اكتب رأيك في الطلب (اختياري)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
                rows={2}
              />
              <button
                onClick={submitReview}
                disabled={submitting}
                className="w-full bg-brand-orange text-white font-bold py-2.5 rounded-xl disabled:opacity-50"
              >
                {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
