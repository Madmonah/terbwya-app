'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// مشاركة صفحة المطعم — navigator.share على الموبايل، ونسخ اللينك على الديسكتوب
export default function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href.split('?')[0];
    const text = `جرب ${name} على ترباوية 🍽️`;

    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url });
        return;
      } catch {
        // المستخدم لغى المشاركة — عادي
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('اتنسخ لينك المطعم — ابعته لأي حد!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('مقدرناش ننسخ اللينك');
    }
  }

  return (
    <button
      onClick={handleShare}
      aria-label="شارك المطعم"
      className="w-9 h-9 rounded-full bg-brand-cream text-brand-ink/60 hover:text-brand-red flex items-center justify-center transition-colors shrink-0"
    >
      {copied ? <Check size={17} className="text-green-600" /> : <Share2 size={17} />}
    </button>
  );
}
