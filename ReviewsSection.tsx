'use client';

import { Star } from 'lucide-react';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  owner_reply: string | null;
  created_at: string;
};

export default function ReviewsSection({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="bg-white border border-dashed border-brand-amber rounded-xl p-6 text-center text-brand-ink/50 text-sm">
        لسه مفيش تقييمات لهذا المطعم — كن أول من يقيّم بعد طلبك!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < r.rating ? 'text-brand-orange' : 'text-gray-200'}
                  fill={i < r.rating ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <span className="text-xs text-brand-ink/40">
              {new Date(r.created_at).toLocaleDateString('ar-EG')}
            </span>
          </div>
          {r.comment && <p className="text-sm text-brand-ink/80">{r.comment}</p>}
          {r.owner_reply && (
            <div className="mt-2 bg-brand-cream rounded-lg p-2.5 text-xs">
              <span className="font-bold text-brand-red">رد المطعم: </span>
              <span className="text-brand-ink/70">{r.owner_reply}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
